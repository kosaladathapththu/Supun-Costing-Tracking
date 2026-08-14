import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileBarChart,
  Truck,
  Settings,
  Menu,
  LogOut,
  Bell,
  ChevronDown,
  Container,
  UserRound,
  KeyRound,
  CheckCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { systemUpdates } from '../data/systemUpdates';

const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/products', 'Product Costing', Package],
  ['/costings', 'Shipments', Container],
  ['/reports', 'Reports', FileBarChart],
  ['/suppliers', 'Suppliers', Truck],
  ['/settings', 'Settings', Settings],
];

const notificationIcon = action => {
  const text = action.toLowerCase();
  if (text.includes('product')) return Package;
  if (text.includes('shipment')) return Container;
  return Settings;
};

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('');
  const { data, user, logout, resetPassword, updateAccountName } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const location = useLocation();
  const label = nav.find(n => n[0] === location.pathname)?.[1] || 'Costing';
  const seenKey = `supun-notifications-seen-${user?.uid}`;
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(seenKey)) || 0);
  const activityNotifications = useMemo(
    () => data.audit.map(item => ({ ...item, time: new Date(item.date).getTime() })),
    [data.audit],
  );
  const releaseNotifications = useMemo(
    () => systemUpdates.map(item => ({ ...item, time: new Date(item.date).getTime() })),
    [],
  );
  const notifications = useMemo(
    () => [...activityNotifications, ...releaseNotifications].sort((a, b) => b.time - a.time),
    [activityNotifications, releaseNotifications],
  );
  const unread = notifications.filter(item => item.time > lastSeen).length;

  const toggleNotifications = () => {
    const opening = panel !== 'notifications';
    setPanel(opening ? 'notifications' : '');
    if (opening) {
      const now = Date.now();
      localStorage.setItem(seenKey, String(now));
      setLastSeen(now);
    }
  };
  const saveName = async event => {
    event.preventDefault();
    setAccountError('');
    setAccountMessage('');
    try {
      await updateAccountName(name);
      setAccountMessage('Your display name was updated.');
    } catch (error) {
      setAccountError(error.message || 'Unable to update your name.');
    }
  };
  const changePassword = async () => {
    setAccountError('');
    setAccountMessage('');
    try {
      await resetPassword(user.email);
      setAccountMessage('Password-change email sent. Check your inbox.');
    } catch (error) {
      setAccountError(error.message || 'Unable to send the password email.');
    }
  };

  return (
    <div className="shell">
      <aside className={open ? 'open' : ''}>
        <div className="brand">
          <img className="brand-mark logo-image" src="/supun-group-logo.png" alt="Supun Group" />
          <div>
            <b>SUPUN GROUP</b>
            <span>Costing & Pricing</span>
          </div>
        </div>
        <nav>
          {nav.map(([to, text, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} />
              <span>{text}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <b>{user?.name}</b>
            <span>{user?.role}</span>
          </div>
          <button onClick={logout} title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main>
        <header>
          <button className="menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div>
            <span className="mobile-title">{label}</span>
          </div>
          <div className="head-actions">
            <button className="icon-btn notification-trigger" onClick={toggleNotifications}>
              <Bell size={19} />
              {unread > 0 && <strong>{Math.min(unread, 99)}</strong>}
            </button>
            <button
              className="profile"
              onClick={() => {
                setName(user?.name || '');
                setPanel(panel === 'profile' ? '' : 'profile');
              }}
            >
              <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <span>{user?.name}</span>
              <ChevronDown size={15} />
            </button>
            {panel === 'notifications' && (
              <div className="header-panel notification-panel">
                <div className="header-panel-title">
                  <div>
                    <b>Notifications</b>
                    <small>Products, shipments and system updates</small>
                  </div>
                  <CheckCheck size={18} />
                </div>
                <div className="notification-list">
                  <div className="notification-section-title">System updates</div>
                  {releaseNotifications.map(item => (
                    <div className="notification-item system-notification" key={item.id}>
                      <span className="notification-type">
                        <Settings size={15} />
                      </span>
                      <div>
                        <b>{item.title}</b>
                        <p>{item.detail}</p>
                        <small>{new Date(item.date).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                  <div className="notification-section-title">Recent activity</div>
                  {activityNotifications.slice(0, 10).map(item => {
                    const Icon = notificationIcon(item.action);
                    return (
                      <div className="notification-item" key={item.id}>
                        <span className="notification-type">
                          <Icon size={15} />
                        </span>
                        <div>
                          <b>{item.action}</b>
                          <small>
                            {item.user} · {new Date(item.date).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {panel === 'profile' && (
              <div className="header-panel account-panel">
                <div className="account-heading">
                  <div className="avatar large-account-avatar">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <b>{user?.name}</b>
                    <small>{user?.email}</small>
                    <em>{user?.role}</em>
                  </div>
                </div>
                <form onSubmit={saveName}>
                  <label>
                    <UserRound size={15} /> Display name
                    <input value={name} onChange={event => setName(event.target.value)} />
                  </label>
                  <button className="btn primary">Save name</button>
                </form>
                <button className="account-action" onClick={changePassword}>
                  <KeyRound size={17} />
                  <span>
                    <b>Change password</b>
                    <small>Receive a secure Firebase email</small>
                  </span>
                </button>
                {accountError && <div className="error">{accountError}</div>}
                {accountMessage && <div className="login-notice">{accountMessage}</div>}
                <button className="account-action logout-action" onClick={logout}>
                  <LogOut size={17} /> Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
