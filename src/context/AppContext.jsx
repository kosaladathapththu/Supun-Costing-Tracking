import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { seed } from '../data/seed';
import { auth, db, firebaseEnabled } from '../services/firebase';

const C = createContext();
const STORAGE_KEY = 'supun-costing-data-v1';
const SECTIONS = ['products', 'suppliers', 'categories', 'costTypes', 'costings', 'audit'];
const productCategories = [
  'Refrigerators',
  'Fans',
  'Cookers',
  'Air Conditioners',
  'Washing Machines',
  'Small Appliances',
  'Other',
];

const migrate = value => {
  const data = { ...seed, ...value };
  const legacy = ['Body Parts', 'Spare Parts', 'Accessories', 'Components'];
  const categories = data.categories || [];
  return categories.some(category => legacy.includes(category))
    ? {
        ...data,
        categories: [...productCategories, ...categories.filter(x => !legacy.includes(x))],
      }
    : data;
};

const readLocalData = () => {
  try {
    return migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)) || seed);
  } catch {
    return migrate(seed);
  }
};

const profile = account => ({
  uid: account.uid,
  name: (account.displayName || account.email?.split('@')[0] || 'User').replace(/[._]/g, ' '),
  email: account.email,
  role: 'CFO / Admin',
});

export function AppProvider({ children }) {
  const [data, setData] = useState(readLocalData);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(firebaseEnabled);
  const [syncError, setSyncError] = useState('');
  const userRef = useRef(null);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  useEffect(() => {
    if (!firebaseEnabled) {
      setAuthLoading(false);
      return undefined;
    }

    let stopDataListeners = [];
    let cancelled = false;
    const stopAuthListener = onAuthStateChanged(auth, async account => {
      stopDataListeners.forEach(stop => stop());
      stopDataListeners = [];
      userRef.current = account;
      setUser(account ? profile(account) : null);
      setSyncError('');

      if (!account) {
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      try {
        const localData = readLocalData();
        const references = SECTIONS.map(section => doc(db, 'appData', section));
        const snapshots = await Promise.all(references.map(reference => getDoc(reference)));
        const cloudData = {};

        await Promise.all(
          snapshots.map((snapshot, index) => {
            const section = SECTIONS[index];
            if (snapshot.exists()) {
              cloudData[section] = snapshot.data().items || [];
              return Promise.resolve();
            }
            cloudData[section] = localData[section] || [];
            return setDoc(references[index], {
              items: cloudData[section],
              updatedAt: serverTimestamp(),
              updatedBy: account.uid,
            });
          }),
        );

        if (cancelled) return;
        setData(migrate(cloudData));
        stopDataListeners = references.map((reference, index) =>
          onSnapshot(
            reference,
            snapshot => {
              if (!snapshot.exists()) return;
              const section = SECTIONS[index];
              setData(current => migrate({ ...current, [section]: snapshot.data().items || [] }));
            },
            error => setSyncError(error.message || 'Unable to synchronize Firebase data.'),
          ),
        );
      } catch (error) {
        setSyncError(error.message || 'Unable to load Firebase data.');
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      stopAuthListener();
      stopDataListeners.forEach(stop => stop());
    };
  }, []);

  const login = async (email, password) => {
    if (!firebaseEnabled) throw new Error('Firebase is not configured.');
    const result = await signInWithEmailAndPassword(auth, email, password);
    return profile(result.user);
  };

  const logout = async () => {
    if (firebaseEnabled) await signOut(auth);
    userRef.current = null;
    setUser(null);
  };

  const update = (section, value) => {
    setData(current => {
      const items = typeof value === 'function' ? value(current[section]) : value;
      if (firebaseEnabled && userRef.current && SECTIONS.includes(section)) {
        setDoc(doc(db, 'appData', section), {
          items,
          updatedAt: serverTimestamp(),
          updatedBy: userRef.current.uid,
        }).catch(error => setSyncError(error.message || 'Unable to save data to Firebase.'));
      }
      return { ...current, [section]: items };
    });
  };

  const value = useMemo(
    () => ({ data, update, user, login, logout, authLoading, syncError }),
    [data, user, authLoading, syncError],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useApp = () => useContext(C);
