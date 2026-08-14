import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Eye, Package, Plus, Printer, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Field, Modal, PageHeader, SearchBox } from '../components/UI';
import { allocationWeights, calculateCosting, money, uid } from '../utils/calculations';

const currencies = ['LKR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'];
const types = ['Finished Product', 'Component', 'Spare Part', 'Accessory'];

export default function Products() {
  const { data, update, user } = useApp();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(() => params.get('add') === '1');
  const [view, setView] = useState(null);
  const [editing, setEditing] = useState(null);
  const blank = () => ({
    code: `SGP-${String(data.products.length + 1).padStart(5, '0')}`,
    name: '',
    category: data.categories[0] || '',
    categoryCustom: false,
    type: types[0],
    weight: '',
    volume: '',
    supplierId: '',
    newSupplier: false,
    supplierName: '',
    supplierCountry: '',
    supplierCurrency: 'USD',
    quantity: '',
    unitPrice: '',
    retailPrice: '',
    wholesalePrice: '',
    currency: 'LKR',
    exchangeRate: '',
    date: '',
    invoice: '',
    reference: '',
    status: 'Draft',
    notes: '',
    costs: data.costTypes.map(type => ({ type, amount: '', method: 'value' })),
  });
  const [form, setForm] = useState(blank);
  const preview = useMemo(
    () =>
      calculateCosting({
        items: [
          {
            productId: 'new',
            quantity: form.quantity,
            unitPrice: form.unitPrice,
            weight: form.weight,
            volume: form.volume,
            retailPrice: form.retailPrice,
            wholesalePrice: form.wholesalePrice,
          },
        ],
        costs: form.costs,
      }),
    [form],
  );
  const latest = useMemo(() => {
    const map = {};
    data.costings
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .forEach(raw => {
        const costing = calculateCosting(raw);
        costing.items.forEach(item => {
          if (!map[item.productId]) map[item.productId] = { costing, item };
        });
      });
    return map;
  }, [data.costings]);
  const list = data.products.filter(p =>
    (p.name + p.code + p.category).toLowerCase().includes(q.toLowerCase()),
  );
  const open = () => {
    setForm(blank());
    setAdding(true);
  };
  const close = () => {
    setAdding(false);
    setEditing(null);
    setParams({});
  };
  const edit = p => {
    const r = latest[p.id],
      i = r?.item,
      c = r?.costing;
    setEditing({ productId: p.id, costingId: c?.id });
    setForm({
      ...blank(),
      ...p,
      categoryCustom: false,
      supplierId: c?.supplierId || '',
      quantity: i?.quantity ?? '',
      unitPrice: i?.unitPrice ?? '',
      retailPrice: i?.retailPrice ?? '',
      wholesalePrice: i?.wholesalePrice ?? '',
      currency: c?.currency || 'LKR',
      exchangeRate: c?.exchangeRate ?? '',
      date: c?.date || '',
      invoice: c?.invoice || '',
      reference: c?.reference || '',
      status: c?.status || 'Draft',
      notes: c?.notes || '',
      costs:
        c?.costs?.map(x => ({ ...x })) ||
        data.costTypes.map(type => ({ type, amount: '', method: 'value' })),
    });
    setAdding(true);
  };
  const setCost = (i, key, value) =>
    setForm(f => ({ ...f, costs: f.costs.map((x, j) => (j === i ? { ...x, [key]: value } : x)) }));
  const save = e => {
    e.preventDefault();
    const category = form.category.trim();
    if (category && !data.categories.some(x => x.toLowerCase() === category.toLowerCase()))
      update('categories', xs => [...xs, category]);
    form.costs
      .map(c => c.type.trim())
      .filter(Boolean)
      .filter(name => !data.costTypes.some(x => x.toLowerCase() === name.toLowerCase()))
      .forEach(name =>
        update('costTypes', xs =>
          xs.some(x => x.toLowerCase() === name.toLowerCase()) ? xs : [...xs, name],
        ),
      );
    const productId = uid('PRD');
    let supplierId = form.supplierId;
    if (form.newSupplier && form.supplierName.trim()) {
      supplierId = uid('SUP');
      update('suppliers', s => [
        ...s,
        {
          id: supplierId,
          name: form.supplierName,
          country: form.supplierCountry,
          currency: form.supplierCurrency,
          contact: '',
          notes: '',
        },
      ]);
    }
    const product = {
      id: productId,
      code: form.code,
      name: form.name,
      category,
      type: form.type,
      weight: Number(form.weight) || 0,
      volume: Number(form.volume) || 0,
      status: 'Active',
    };
    const costing = {
      id: uid('CST'),
      reference: form.reference || `PC-${form.code}-${Date.now().toString().slice(-5)}`,
      supplierId,
      date: form.date,
      currency: form.currency,
      exchangeRate: Number(form.exchangeRate) || 1,
      invoice: form.invoice,
      notes: form.notes,
      status: form.status,
      items: [
        {
          productId,
          quantity: Number(form.quantity) || 0,
          unitPrice: Number(form.unitPrice) || 0,
          weight: Number(form.weight) || 0,
          volume: Number(form.volume) || 0,
          retailPrice: Number(form.retailPrice) || 0,
          wholesalePrice: Number(form.wholesalePrice) || 0,
        },
      ],
      costs: form.costs
        .filter(c => Number(c.amount))
        .map(c => ({ ...c, amount: Number(c.amount) })),
    };
    if (editing) {
      update('products', p =>
        p.map(x => (x.id === editing.productId ? { ...product, id: editing.productId } : x)),
      );
      update('costings', cs =>
        editing.costingId
          ? cs.map(x =>
              x.id === editing.costingId
                ? {
                    ...costing,
                    id: editing.costingId,
                    items: [{ ...costing.items[0], productId: editing.productId }],
                  }
                : x,
            )
          : [{ ...costing, items: [{ ...costing.items[0], productId: editing.productId }] }, ...cs],
      );
      update('audit', a => [
        {
          id: uid('AUD'),
          user: user.name,
          action: `Updated product ${product.code} and costing`,
          date: new Date().toISOString(),
          oldValue: 'Existing values',
          newValue: costing.status,
        },
        ...a,
      ]);
    } else {
      update('products', p => [...p, product]);
      update('costings', c => [costing, ...c]);
      update('audit', a => [
        {
          id: uid('AUD'),
          user: user.name,
          action: `Created product ${product.code} with initial costing`,
          date: new Date().toISOString(),
          oldValue: 'None',
          newValue: costing.status,
        },
        ...a,
      ]);
    }
    close();
  };
  const print = p => {
    setView(p);
    setTimeout(() => window.print(), 80);
  };
  const remove = p => {
    if (
      !window.confirm(
        `Delete ${p.name || p.code}? This will also remove its costing history. This action cannot be undone.`,
      )
    )
      return;
    update('products', items => items.filter(x => x.id !== p.id));
    update('costings', shipments =>
      shipments
        .map(shipment => ({
          ...shipment,
          items: (shipment.items || []).filter(item => item.productId !== p.id),
        }))
        .filter(shipment => shipment.items.length > 0),
    );
    update('audit', logs => [
      {
        id: uid('AUD'),
        user: user.name,
        action: `Deleted product ${p.code}`,
        date: new Date().toISOString(),
        oldValue: p.name || p.code,
        newValue: 'Deleted',
      },
      ...logs,
    ]);
    if (view?.id === p.id) setView(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="PRODUCT COSTING"
        title="Products"
        description="Review every product cost and selling result from one place."
        action={
          <Button onClick={open}>
            <Plus size={18} />
            Add product & costing
          </Button>
        }
      />
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search products..." />
          <span>{list.length} products</span>
        </div>
        <div className="table-wrap">
          <table className="product-overview-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Purchase total</th>
                <th>Additional</th>
                <th>Total landed</th>
                <th>buying price</th>
                <th>landed cost</th>
                <th>Retail price</th>
                <th>Markup</th>
                <th>Margin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const r = latest[p.id],
                  i = r?.item;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <div className="mini-icon">
                          <Package />
                        </div>
                        <span>
                          <b>{p.name || 'Unnamed product'}</b>
                          <small>
                            {p.code} · {p.category}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Purchase total">{i ? money(i.purchaseCost) : '—'}</td>
                    <td data-label="Additional costs">{i ? money(i.allocatedCost) : '—'}</td>
                    <td data-label="Total landed">
                      <b>{i ? money(i.totalLandedCost) : 'Not costed'}</b>
                    </td>
                    <td data-label="Buying price / unit">{i ? money(i.unitPrice) : '—'}</td>
                    <td data-label="Landed cost / unit">{i ? money(i.unitLandedCost) : '—'}</td>
                    <td data-label="Retail price">{i ? money(i.retailPrice) : '—'}</td>
                    <td data-label="Markup">
                      {i ? `${i.pricing.retail.markup.toFixed(1)}%` : '—'}
                    </td>
                    <td data-label="Margin">
                      {i ? `${i.pricing.retail.margin.toFixed(1)}%` : '—'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button variant="secondary" onClick={() => setView(p)}>
                          <Eye size={15} />
                          View
                        </Button>
                        <Button variant="secondary" onClick={() => edit(p)}>
                          <Pencil size={15} />
                          Edit
                        </Button>
                        {i && (
                          <Button variant="secondary" onClick={() => print(p)}>
                            <Printer size={15} />
                            Print
                          </Button>
                        )}
                        <Button variant="danger" onClick={() => remove(p)}>
                          <Trash2 size={15} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {view && (
        <ProductDetail
          product={view}
          record={latest[view.id]}
          suppliers={data.suppliers}
          onClose={() => setView(null)}
          onPrint={() => print(view)}
        />
      )}{' '}
      {adding && (
        <Modal
          title={editing ? 'Edit product & costing' : 'Add product with complete costing'}
          onClose={close}
          wide
        >
          <form onSubmit={save} className="complete-product-form">
            <Section n="1" title="Product details">
              <Grid>
                <Field label="Product code (automatic)">
                  <input readOnly value={form.code} />
                </Field>
                <Input
                  label="Product name"
                  value={form.name}
                  set={v => setForm({ ...form, name: v })}
                />
                <Field label="Category">
                  <select
                    value={form.categoryCustom ? '__new__' : form.category}
                    onChange={e =>
                      e.target.value === '__new__'
                        ? setForm({ ...form, category: '', categoryCustom: true })
                        : setForm({ ...form, category: e.target.value, categoryCustom: false })
                    }
                  >
                    <option value="">No category</option>
                    {data.categories.map(x => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                    <option value="__new__">+ Add new category...</option>
                  </select>
                  {form.categoryCustom && (
                    <input
                      autoFocus
                      value={form.category}
                      placeholder="Type new category name"
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Product type">
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    {types.map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Input
                  label="Weight per unit (kg)"
                  type="number"
                  value={form.weight}
                  set={v => setForm({ ...form, weight: v })}
                />
                <Input
                  label="Volume per unit (m³)"
                  type="number"
                  value={form.volume}
                  set={v => setForm({ ...form, volume: v })}
                />
              </Grid>
            </Section>
            <Section n="2" title="Supplier & costing information">
              <div className="inline-choice">
                <label>
                  <input
                    type="radio"
                    checked={!form.newSupplier}
                    onChange={() => setForm({ ...form, newSupplier: false })}
                  />
                  Existing supplier
                </label>
                <label>
                  <input
                    type="radio"
                    checked={form.newSupplier}
                    onChange={() => setForm({ ...form, newSupplier: true })}
                  />
                  New supplier
                </label>
              </div>
              <Grid>
                {form.newSupplier ? (
                  <>
                    <Input
                      label="Supplier name"
                      value={form.supplierName}
                      set={v => setForm({ ...form, supplierName: v })}
                    />
                    <Input
                      label="Country"
                      value={form.supplierCountry}
                      set={v => setForm({ ...form, supplierCountry: v })}
                    />
                  </>
                ) : (
                  <Field label="Supplier">
                    <select
                      value={form.supplierId}
                      onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    >
                      <option value="">Select supplier</option>
                      {data.suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Input
                  label="Costing date"
                  type="date"
                  value={form.date}
                  set={v => setForm({ ...form, date: v })}
                />
                <Input
                  label="Reference"
                  value={form.reference}
                  set={v => setForm({ ...form, reference: v })}
                />
                <Input
                  label="Invoice reference"
                  value={form.invoice}
                  set={v => setForm({ ...form, invoice: v })}
                />
                <Field label="Currency">
                  <select
                    value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value })}
                  >
                    {currencies.map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Input
                  label="Exchange rate"
                  type="number"
                  value={form.exchangeRate}
                  set={v => setForm({ ...form, exchangeRate: v })}
                />
              </Grid>
            </Section>
            <Section n="3" title="Purchase & all additional costs">
              <Grid>
                <Input
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  set={v => setForm({ ...form, quantity: v })}
                />
                <Input
                  label="Supplier unit price"
                  type="number"
                  value={form.unitPrice}
                  set={v => setForm({ ...form, unitPrice: v })}
                />
                <Metric label="Purchase cost" value={money(preview.items[0]?.purchaseCost)} />
              </Grid>
              <div className="default-cost-grid">
                {form.costs.map((c, i) => (
                  <div className="compact-cost" key={i}>
                    <div className="cost-type-picker">
                      <select
                        value={c.custom ? '__new__' : c.type}
                        onChange={e =>
                          e.target.value === '__new__'
                            ? setForm(f => ({
                                ...f,
                                costs: f.costs.map((x, j) =>
                                  j === i ? { ...x, type: '', custom: true } : x,
                                ),
                              }))
                            : setForm(f => ({
                                ...f,
                                costs: f.costs.map((x, j) =>
                                  j === i ? { ...x, type: e.target.value, custom: false } : x,
                                ),
                              }))
                        }
                      >
                        <option value="">Select cost type</option>
                        {data.costTypes.map(x => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                        <option value="__new__">+ Add new cost type...</option>
                      </select>
                      {c.custom && (
                        <input
                          className="custom-cost-name"
                          value={c.type}
                          placeholder="Type cost name"
                          onChange={e => setCost(i, 'type', e.target.value)}
                        />
                      )}
                    </div>
                    <input
                      type="number"
                      value={c.amount}
                      placeholder="0.00"
                      onChange={e => setCost(i, 'amount', e.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() =>
                        setForm(f => ({ ...f, costs: f.costs.filter((_, j) => j !== i) }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    costs: [...f.costs, { type: '', amount: '', method: 'value', custom: false }],
                  }))
                }
              >
                <Plus size={15} />
                Add another cost
              </Button>
            </Section>
            <Section n="4" title="Selling prices & profitability">
              <Grid>
                <Input
                  label="Retail selling price"
                  type="number"
                  value={form.retailPrice}
                  set={v => setForm({ ...form, retailPrice: v })}
                />
                <Input
                  label="Wholesale selling price"
                  type="number"
                  value={form.wholesalePrice}
                  set={v => setForm({ ...form, wholesalePrice: v })}
                />
                <Field label="Save as">
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Draft</option>
                    <option>Under Review</option>
                    <option>Finalized</option>
                  </select>
                </Field>
              </Grid>
              <div className="product-cost-summary">
                <Metric label="Additional costs" value={money(preview.additionalTotal)} />
                <Metric
                  label="Total landed cost"
                  value={money(preview.items[0]?.totalLandedCost)}
                />
                <Metric
                  label="Unit landed cost"
                  value={money(preview.items[0]?.unitLandedCost)}
                  accent
                />
                <Metric
                  label="Retail profit"
                  value={money(preview.items[0]?.pricing.retail.profit)}
                />
                <Metric
                  label="Retail markup"
                  value={`${preview.items[0]?.pricing.retail.markup.toFixed(2)}%`}
                />
                <Metric
                  label="Retail margin"
                  value={`${preview.items[0]?.pricing.retail.margin.toFixed(2)}%`}
                />
                <Metric
                  label="Wholesale profit"
                  value={money(preview.items[0]?.pricing.wholesale.profit)}
                />
                <Metric
                  label="Wholesale markup"
                  value={`${preview.items[0]?.pricing.wholesale.markup.toFixed(2)}%`}
                />
                <Metric
                  label="Wholesale margin"
                  value={`${preview.items[0]?.pricing.wholesale.margin.toFixed(2)}%`}
                />
              </div>
            </Section>
            <div className="sticky-form-actions">
              <span>
                <Calculator size={17} />
                Product and costing save together
              </span>
              <div>
                <Button type="button" variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button>{editing ? 'Update product & costing' : 'Save product & costing'}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function ProductDetail({ product, record, suppliers, onClose, onPrint }) {
  const i = record?.item,
    c = record?.costing;
  if (!i)
    return (
      <Modal title="Product details" onClose={onClose} wide>
        <div className="uncosted-detail">
          <Package />
          <h2>{product.name || 'Unnamed product'}</h2>
          <p>{product.code} has no costing record yet.</p>
        </div>
      </Modal>
    );
  const idx = c.items.findIndex(x => x.productId === product.id);
  const quantity = Number(i.quantity) || 0;
  const retailTotal = (Number(i.retailPrice) || 0) * quantity;
  const wholesaleTotal = (Number(i.wholesalePrice) || 0) * quantity;
  const retailTotalProfit = i.pricing.retail.profit * quantity;
  const wholesaleTotalProfit = i.pricing.wholesale.profit * quantity;
  const costs = c.costs
    .map(cost => ({
      name: cost.type,
      amount: (Number(cost.amount) || 0) * (allocationWeights(c.items, cost.method)[idx] || 0),
    }))
    .filter(x => x.amount);
  return (
    <Modal title={`${product.code} — Complete product costing`} onClose={onClose} wide>
      <article className="product-detail product-print-sheet">
        <div className="detail-hero">
          <div>
            <small>PRODUCT COSTING</small>
            <h2>{product.name || 'Unnamed product'}</h2>
            <p>
              {product.code} · {product.category} · {product.type}
            </p>
          </div>
          <Button onClick={onPrint}>
            <Printer size={16} />
            Print product report
          </Button>
        </div>
        <div className="detail-facts">
          <Metric
            label="Supplier"
            value={suppliers.find(s => s.id === c.supplierId)?.name || '—'}
          />
          <Metric label="Quantity" value={i.quantity} />
          <Metric label="Supplier unit price" value={money(i.unitPrice)} />
          <Metric label="Purchase total" value={money(i.purchaseCost)} />
        </div>
        <section>
          <h3>Cost breakdown</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cost component</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Product purchase cost</td>
                  <td data-label="Amount">{money(i.purchaseCost)}</td>
                </tr>
                {costs.map((x, n) => (
                  <tr key={n}>
                    <td>{x.name}</td>
                    <td data-label="Allocated amount">{money(x.amount)}</td>
                  </tr>
                ))}
                <tr className="strong-row">
                  <td>Total additional costs</td>
                  <td data-label="Amount">{money(i.allocatedCost)}</td>
                </tr>
                <tr className="strong-row">
                  <td>Total landed cost</td>
                  <td data-label="Amount">{money(i.totalLandedCost)}</td>
                </tr>
                <tr className="grand-row">
                  <td>Unit landed cost</td>
                  <td data-label="Amount">{money(i.unitLandedCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3>Selling prices & profitability</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Price level</th>
                  <th>Unit price</th>
                  <th>Total sales</th>
                  <th>Profit / unit</th>
                  <th>Total profit</th>
                  <th>Markup</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>Retail</b>
                  </td>
                  <td data-label="Unit selling price">{money(i.retailPrice)}</td>
                  <td data-label="Total selling value">{money(retailTotal)}</td>
                  <td data-label="Profit / unit">{money(i.pricing.retail.profit)}</td>
                  <td data-label="Total profit">{money(retailTotalProfit)}</td>
                  <td data-label="Full markup">{i.pricing.retail.markup.toFixed(2)}%</td>
                  <td data-label="Full margin">{i.pricing.retail.margin.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>
                    <b>Wholesale</b>
                  </td>
                  <td data-label="Unit selling price">{money(i.wholesalePrice)}</td>
                  <td data-label="Total selling value">{money(wholesaleTotal)}</td>
                  <td data-label="Profit / unit">{money(i.pricing.wholesale.profit)}</td>
                  <td data-label="Total profit">{money(wholesaleTotalProfit)}</td>
                  <td data-label="Full markup">{i.pricing.wholesale.markup.toFixed(2)}%</td>
                  <td data-label="Full margin">{i.pricing.wholesale.margin.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <footer>
          Supun Group of Companies · Product Costing & Pricing Report ·{' '}
          {new Date().toLocaleDateString()}
        </footer>
      </article>
    </Modal>
  );
}
function Section({ n, title, children }) {
  return (
    <section className="complete-section">
      <div className="section-title">
        <span>{n}</span>
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
function Grid({ children }) {
  return <div className="form-grid three">{children}</div>;
}
function Input({ label, value, set, type = 'text' }) {
  return (
    <Field label={label}>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={e => set(e.target.value)}
      />
    </Field>
  );
}
function Metric({ label, value, accent = false }) {
  return (
    <div className={accent ? 'accent' : ''}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
