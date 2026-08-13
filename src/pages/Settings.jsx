import { useState } from 'react';
import { Plus, Trash2, ShieldCheck, ScrollText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, PageHeader } from '../components/UI';
export default function Settings() {
  const { data, update } = useApp();
  const [cat, setCat] = useState(''),
    [cost, setCost] = useState('');
  const add = (key, value, set) => {
    if (value.trim()) update(key, x => [...x, value.trim()]);
    set('');
  };
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Settings"
        description="Configure master data, access roles and governance."
      />
      <div className="settings-grid">
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
