import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { seed } from '../data/seed';
import { app, auth, db, firebaseEnabled } from '../services/firebase';

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
  const [users, setUsers] = useState([]);
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
        if (account.email?.toLowerCase() !== 'cfo@supungroup.lk') {
          const userProfile = await getDoc(doc(db, 'users', account.uid));
          if (userProfile.exists()) {
            setUser(current => ({ ...current, ...userProfile.data(), uid: account.uid }));
          }
        }
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
        if (account.email?.toLowerCase() === 'cfo@supungroup.lk') {
          stopDataListeners.push(
            onSnapshot(collection(db, 'users'), snapshot => {
              setUsers(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
            }),
          );
        } else {
          setUsers([]);
        }
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

  const resetPassword = async email => {
    if (!firebaseEnabled) throw new Error('Firebase is not configured.');
    await sendPasswordResetEmail(auth, email);
  };

  const createSystemUser = async ({ name, email, password, role }) => {
    if (userRef.current?.email?.toLowerCase() !== 'cfo@supungroup.lk') {
      throw new Error('Only the CFO can create system users.');
    }
    const secondaryApp = initializeApp(app.options, `create-user-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await updateProfile(result.user, { displayName: name });
      await setDoc(doc(db, 'users', result.user.uid), {
        name,
        email: email.toLowerCase(),
        role,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: userRef.current.uid,
      });
      await sendPasswordResetEmail(auth, email);
      return result.user.uid;
    } finally {
      await signOut(secondaryAuth).catch(() => undefined);
      await deleteApp(secondaryApp);
    }
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
    () => ({
      data,
      update,
      user,
      users,
      login,
      logout,
      resetPassword,
      createSystemUser,
      authLoading,
      syncError,
    }),
    [data, user, users, authLoading, syncError],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useApp = () => useContext(C);
