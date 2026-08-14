import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Calculator, TrendingUp, ArrowUpRight, Clock, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateCosting, money } from '../utils/calculations';
import { Badge, PageHeader } from '../components/UI';
export default function Dashboard() {
  const { data, user } = useApp(),
    nav = useNavigate();
  const [q, setQ] = useState('');
  const costings = useMemo(() => data.costings.map(calculateCosting), [data.costings]);
  const latest = costings[0];
  const latestProducts = useMemo(() => {
    const latestCostByProduct = {};
    [...costings]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(costing =>
        costing.items.forEach(item => {
          if (!latestCostByProduct[item.productId]) latestCostByProduct[item.productId] = item;
        }),
      );
    return data.products
      .slice(-5)
      .reverse()
      .map(product => ({ ...product, costing: latestCostByProduct[product.id] }));
  }, [data.products, costings]);
  const results = q
    ? data.products.filter(p => (p.name + p.code).toLowerCase().includes(q.toLowerCase()))
    : [];
  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.name.split(' ')[0]}.`}
        description="Here's what is happening with your product costs."
        action={
          <div className="action-row">
            <button className="btn secondary" onClick={() => nav('/costings/new')}>
              <Plus size={18} />
              Add full shipment
            </button>
            <button className="btn primary" onClick={() => nav('/products?add=1')}>
              <Plus size={18} />
              Add product & costing
            </button>
          </div>
        }
      />
      <div className="quick-search">
        <Search />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Quick search a product by name or code..."
        />
        {results.length > 0 && (
          <div className="search-results">
            {results.map(p => (
              <button key={p.id} onClick={() => nav('/products')}>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.code} Â· {p.category}
                  </small>
                </span>
                <ArrowUpRight />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="stats">
        <Stat
          icon={Package}
          label="Total products"
          value={data.products.length}
          note="Active catalogue"
        />
        <Stat
          icon={Calculator}
          label="Shipments recorded"
          value={data.costings.length}
          note="1 finalized"
        />
        <Stat
          icon={TrendingUp}
          label="Latest landed value"
          value={money(latest?.landedTotal)}
          note="Across latest shipment"
        />
        <Stat
          icon={Clock}
          label="Awaiting review"
          value={data.costings.filter(c => c.status === 'Under Review').length}
          note="Needs attention"
        />
      </div>
      <section className="card latest-products">
        <div className="card-title">
          <div>
            <h2>Latest products</h2>
            <p>Recently added products and their latest pricing</p>
          </div>
          <button className="link" onClick={() => nav('/products')}>
            View all
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Buy / unit</th>
                <th>Landed / unit</th>
                <th>Retail</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {latestProducts.map(product => (
                <tr key={product.id} onClick={() => nav('/products')}>
                  <td>
                    <b>{product.name || 'Unnamed product'}</b>
                    <small>{product.code}</small>
                  </td>
                  <td>{product.category || '—'}</td>
                  <td>{product.costing ? money(product.costing.unitPrice) : '—'}</td>
                  <td>
                    <b>{product.costing ? money(product.costing.unitLandedCost) : 'Not costed'}</b>
                  </td>
                  <td>{product.costing ? money(product.costing.retailPrice) : '—'}</td>
                  <td>
                    <Badge>{product.status || 'Active'}</Badge>
                  </td>
                </tr>
              ))}
              {latestProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-table">
                    No products have been added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Recent shipments</h2>
              <p>Latest full-shipment landed costs</p>
            </div>
            <button className="link" onClick={() => nav('/costings')}>
              View all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Total landed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {costings.slice(0, 5).map(c => (
                  <tr key={c.id} onClick={() => nav(`/costings/${c.id}`)}>
                    <td>
                      <b>{c.reference}</b>
                      <small>{c.id}</small>
                    </td>
                    <td>{data.suppliers.find(s => s.id === c.supplierId)?.name}</td>
                    <td>{c.date}</td>
                    <td>
                      <b>{money(c.landedTotal)}</b>
                    </td>
                    <td>
                      <Badge>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card activity">
          <div className="card-title">
            <div>
              <h2>Recent activity</h2>
              <p>Updates across products and shipments</p>
            </div>
          </div>
          {data.audit.slice(0, 5).map(a => (
            <div className="activity-item" key={a.id}>
              <div className="activity-dot" />
              <div>
                <b>{a.action}</b>
                <p>
                  {a.user} Â· {new Date(a.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
function Stat({ icon: Icon, label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-icon">
        <Icon />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}
