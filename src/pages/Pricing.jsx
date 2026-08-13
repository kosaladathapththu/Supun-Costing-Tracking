import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, SearchBox } from '../components/UI';
import { calculateCosting, money } from '../utils/calculations';
export default function Pricing() {
  const { data } = useApp();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const map = {};
    data.costings
      .filter(c => c.status === 'Finalized')
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(c =>
        calculateCosting(c).items.forEach(i => {
          if (!map[i.productId]) map[i.productId] = { ...i, date: c.date, reference: c.reference };
        }),
      );
    return Object.values(map);
  }, [data.costings]);
  const filtered = rows.filter(r => {
    const p = data.products.find(x => x.id === r.productId);
    return (p?.name + p?.code).toLowerCase().includes(q.toLowerCase());
  });
  return (
    <>
      <PageHeader
        eyebrow="SELLING PRICES"
        title="Pricing"
        description="Latest landed costs, selling prices and profitability."
      />
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search a product..." />
          <span>Based on finalized costings</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Last costed</th>
                <th>Unit landed cost</th>
                <th>Retail price</th>
                <th>Retail profit</th>
                <th>Markup</th>
                <th>Margin</th>
                <th>Wholesale price</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const p = data.products.find(x => x.id === r.productId);
                return (
                  <tr key={r.productId}>
                    <td>
                      <b>{p?.name}</b>
                      <small>{p?.code}</small>
                    </td>
                    <td>
                      {r.date}
                      <small>{r.reference}</small>
                    </td>
                    <td>
                      <b>{money(r.unitLandedCost)}</b>
                    </td>
                    <td>{money(r.retailPrice)}</td>
                    <td className={r.pricing.retail.profit >= 0 ? 'positive' : 'negative'}>
                      {money(r.pricing.retail.profit)}
                    </td>
                    <td>{r.pricing.retail.markup.toFixed(1)}%</td>
                    <td>{r.pricing.retail.margin.toFixed(1)}%</td>
                    <td>{money(r.wholesalePrice)}</td>
                    <td>{r.pricing.wholesale.margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
