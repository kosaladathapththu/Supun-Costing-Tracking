import { useState } from 'react';
import { Plus, Trash2, ShieldCheck, ScrollText, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, PageHeader } from '../components/UI';
export default function Settings() {
  const { data, update, user, users, createSystemUser } = useApp();
  const [cat, setCat] = useState(''),
    [cost, setCost] = useState(''),
    [newUser, setNewUser] = useState({
      name: '',
      email: '',
      password: '',
      role: 'Viewer',
    }),
    [userMessage, setUserMessage] = useState(''),
    [userError, setUserError] = useState(''),
    [creatingUser, setCreatingUser] = useState(false);
  const add = (key, value, set) => {
    if (value.trim()) update(key, x => [...x, value.trim()]);
    set('');
  };
  const createUser = async event => {
    event.preventDefault();
    setCreatingUser(true);
    setUserMessage('');
    setUserError('');
    try {
      await createSystemUser({ ...newUser, email: newUser.email.trim().toLowerCase() });
      setUserMessage('User created. A password setup email was sent to the account owner.');
      setNewUser({ name: '', email: '', password: '', role: 'Viewer' });
    } catch (error) {
      setUserError(
        error.code === 'auth/email-already-in-use'
          ? 'That email already has a Firebase login.'
          : error.message || 'Unable to create the user.',
      );
    } finally {
      setCreatingUser(false);
    }
  };
  const isCfo = user?.email?.toLowerCase() === 'cfo@supungroup.lk';
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Settings"
        description="Configure master data, access roles and governance."
      />
      <div className="settings-grid">
        {isCfo && (
          <section className="card setting-card user-management">
            <div className="card-title">
              <div>
                <h2>
                  <UserPlus /> Add system user
                </h2>
                <p>Create access and let the email owner choose their own password.</p>
              </div>
            </div>
            <form className="user-form" onSubmit={createUser}>
              <label>
                User name
                <input
                  required
                  value={newUser.name}
                  onChange={event => setNewUser(value => ({ ...value, name: event.target.value }))}
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={event => setNewUser(value => ({ ...value, email: event.target.value }))}
                />
              </label>
              <label>
                Temporary password
                <input
                  required
                  type="password"
                  minLength="6"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={event =>
                    setNewUser(value => ({ ...value, password: event.target.value }))
                  }
                />
              </label>
              <label>
                Access role
                <select
                  value={newUser.role}
                  onChange={event => setNewUser(value => ({ ...value, role: event.target.value }))}
                >
                  <option>Viewer</option>
                  <option>Costing Officer</option>
                </select>
              </label>
              {userError && <div className="error">{userError}</div>}
              {userMessage && <div className="login-notice">{userMessage}</div>}
              <Button disabled={creatingUser}>
                <UserPlus size={17} />
                {creatingUser ? 'Creating user...' : 'Create user & send email'}
              </Button>
            </form>
            {users.length > 0 && (
              <div className="managed-users">
                {users.map(item => (
                  <div className="setting-row" key={item.id}>
                    <span>
                      <b>{item.name}</b>
                      <small>{item.email}</small>
                    </span>
                    <em>{item.role}</em>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        <ListCard
          title="Product categories"
          description="Group products for search and reporting."
          items={data.categories}
          value={cat}
          setValue={setCat}
          add={() => add('categories', cat, setCat)}
          remove={x => update('categories', v => v.filter(y => y !== x))}
        />
        <ListCard
          title="Additional cost types"
          description="Configurable expenses available in every costing."
          items={data.costTypes}
          value={cost}
          setValue={setCost}
          add={() => add('costTypes', cost, setCost)}
          remove={x => update('costTypes', v => v.filter(y => y !== x))}
        />
        <section className="card governance">
          <ShieldCheck />
          <div>
            <h2>User roles</h2>
            <p>
              CFO / Admin, Costing Officer and Viewer roles are supported by the Firebase security
              model.
            </p>
          </div>
        </section>
        <section className="card audit-log">
          <div className="card-title">
            <div>
              <h2>
                <ScrollText /> Audit log
              </h2>
              <p>Append-only record of important financial changes.</p>
            </div>
          </div>
          {data.audit.map(a => (
            <div className="audit-row" key={a.id}>
              <div>
                <b>{a.action}</b>
                <p>
                  {a.user} · {new Date(a.date).toLocaleString()}
                </p>
              </div>
              <span>
                {a.oldValue} → {a.newValue}
              </span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
function ListCard({ title, description, items, value, setValue, add, remove }) {
  return (
    <section className="card setting-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="add-inline">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={`New ${title.toLowerCase().slice(0, -1)}...`}
        />
        <Button onClick={add}>
          <Plus />
        </Button>
      </div>
      {items.map(x => (
        <div className="setting-row" key={x}>
          <span>{x}</span>
          <button className="icon-btn danger" onClick={() => remove(x)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}
