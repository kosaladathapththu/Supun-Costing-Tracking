import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle2, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Field, PageHeader } from '../components/UI';
import { allocationWeights, calculateCosting, money, uid } from '../utils/calculations';

const fresh = {
  reference: '',
  supplierId: '',
  date: new Date().toISOString().slice(0, 10),
  currency: 'LKR',
  exchangeRate: 1,
  invoice: '',
  notes: '',
  status: 'Draft',
  items: [],
  costs: [],
};

export default function CostingBuilder() {
  const { id } = useParams(),
    { data, update, user } = useApp(),
    nav = useNavigate();
  const [searchParams] = useSearchParams();
  const existing = data.costings.find(c => c.id === id);
  const [form, setForm] = useState(
    existing || {
      ...fresh,
      id: uid('CST'),
      costs: data.costTypes.map(type => ({ type, amount: 0, method: 'value' })),
    },
  );
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    country: '',
    currency: 'USD',
    contact: '',
    notes: '',
  });
  const [printProduct, setPrintProduct] = useState(null);
  const calc = useMemo(() => calculateCosting(form), [form]);
  const editing = searchParams.get('edit') === '1';
  const printShipment = searchParams.get('print') === '1';
  const locked = Boolean(existing && !editing);
  const supplier = data.suppliers.find(s => s.id === form.supplierId);
  const change = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem = () => {
    const p = data.products[0];
    change('items', [
      ...form.items,
      {
        productId: p?.id || '',
        quantity: 1,
        unitPrice: 0,
        weight: p?.weight || 0,
        volume: p?.volume || 0,
        retailPrice: 0,
        wholesalePrice: 0,
      },
    ]);
  };
  const setItem = (i, k, v) =>
    change(
      'items',
      form.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
    );
  const addCost = () =>
    change('costs', [...form.costs, { type: data.costTypes[0], amount: 0, method: 'value' }]);

  useEffect(() => {
    if (!printShipment || !existing) return undefined;
    document.body.classList.add('shipment-print-mode');
    const timer = window.setTimeout(() => window.print(), 150);
    const cleanup = () => document.body.classList.remove('shipment-print-mode');
    window.addEventListener('afterprint', cleanup, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, [existing, printShipment]);

  const printOne = productId => {
    setPrintProduct(productId);
    setTimeout(() => window.print(), 80);
  };
  const allocatedBreakdown = productId => {
    const index = form.items.findIndex(i => i.productId === productId);
    return form.costs
      .map(cost => ({
        type: cost.type,
        amount:
          cost.method === 'manual'
            ? Number(cost.manual?.[index]) || 0
            : (Number(cost.amount) || 0) * (allocationWeights(form.items, cost.method)[index] || 0),
      }))
      .filter(x => x.amount !== 0);
  };
  const save = (status = form.status) => {
    let supplierId = form.supplierId;
    if (form.supplierId === '__new__' && newSupplier.name.trim()) {
      supplierId = uid('SUP');
      update('suppliers', s => [...s, { ...newSupplier, id: supplierId }]);
    }
    const record = {
      ...form,
      supplierId,
      status,
      reference:
        form.reference ||
        `IMP-${new Date().getFullYear()}-${String(data.costings.length + 1).padStart(3, '0')}`,
    };
    update('costings', cs =>
      existing ? cs.map(c => (c.id === existing.id ? record : c)) : [record, ...cs],
    );
    update('audit', a => [
      {
        id: uid('AUD'),
        user: user.name,
        action: `${existing ? 'Updated' : 'Created'} shipment ${record.reference}`,
        date: new Date().toISOString(),
        oldValue: existing?.status || '—',
        newValue: status,
      },
      ...a,
    ]);
    nav('/costings');
  };
  const selected = calc.items.find(x => x.productId === printProduct),
    selectedProduct = data.products.find(p => p.id === printProduct);
  const actions = (
    <div className="action-row">
      {existing &&
        calc.items.map((item, i) => (
          <Button
            key={item.productId + i}
            variant="secondary"
            onClick={() => printOne(item.productId)}
          >
            <Printer size={17} />
            Print {data.products.find(p => p.id === item.productId)?.code || `product ${i + 1}`}
          </Button>
        ))}
      {!locked && (
        <>
          <Button variant="secondary" onClick={() => save('Draft')}>
            <Save size={17} />
            Save draft
          </Button>
          <Button onClick={() => save('Finalized')}>
            <CheckCircle2 size={17} />
            Finalize
          </Button>
        </>
      )}
      {selected && (
        <ProductPrintReport
          item={selected}
          product={selectedProduct}
          breakdown={allocatedBreakdown(printProduct)}
        />
      )}
    </div>
  );
  return (
    <>
      <div className="print-heading">
        <h1>SUPUN GROUP OF COMPANIES</h1>
        <h2>Complete Costing & Pricing Report</h2>
        <p>
          {form.reference} Â· Printed {new Date().toLocaleDateString()}
        </p>
      </div>
      <button className="back" onClick={() => nav('/costings')}>
        <ArrowLeft />
        Back to shipments
      </button>
      <PageHeader
        eyebrow={existing ? 'SHIPMENT DETAILS' : 'NEW FULL SHIPMENT'}
        title={existing ? form.reference : 'Add full shipment'}
        description={
          locked
            ? 'This financial record is finalized and read-only.'
            : 'Add products one by one, then enter and allocate all shared shipment costs.'
        }
        action={actions}
      />
      <fieldset disabled={locked} className="builder">
        <section className="card section">
          <div className="section-title">
            <span>1</span>
            <div>
              <h2>Shipment information</h2>
              <p>General details and supplier invoice</p>
            </div>
          </div>
          <div className="form-grid three">
            <Field label="Reference number">
              <input
                value={form.reference}
                placeholder="Auto-generated if blank"
                onChange={e => change('reference', e.target.value)}
              />
            </Field>
            <Field label="Supplier">
              <select value={form.supplierId} onChange={e => change('supplierId', e.target.value)}>
                <option value="">Select supplier</option>
                {data.suppliers.map(s => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__new__">+ Create new supplier...</option>
              </select>
            </Field>
            {form.supplierId === '__new__' && (
              <>
                <Field label="New supplier name">
                  <input
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  />
                </Field>
                <Field label="Country">
                  <input
                    value={newSupplier.country}
                    onChange={e => setNewSupplier({ ...newSupplier, country: e.target.value })}
                  />
                </Field>
                <Field label="Supplier currency">
                  <select
                    value={newSupplier.currency}
                    onChange={e => setNewSupplier({ ...newSupplier, currency: e.target.value })}
                  >
                    {['LKR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'].map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Contact details">
                  <input
                    value={newSupplier.contact}
                    onChange={e => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                  />
                </Field>
                <Field label="Supplier notes">
                  <input
                    value={newSupplier.notes}
                    onChange={e => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                  />
                </Field>
              </>
            )}
            <Field label="Costing date">
              <input type="date" value={form.date} onChange={e => change('date', e.target.value)} />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={e => change('currency', e.target.value)}>
                {['LKR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'].map(x => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Exchange rate to LKR">
              <input
                type="number"
                step="any"
                value={form.exchangeRate}
                onChange={e => change('exchangeRate', e.target.value)}
              />
            </Field>
            <Field label="Invoice reference">
              <input value={form.invoice} onChange={e => change('invoice', e.target.value)} />
            </Field>
          </div>
          <div className="print-shipment">
            <div>
              <span>Reference</span>
              <b>{form.reference}</b>
            </div>
            <div>
              <span>Supplier</span>
              <b>{supplier?.name || 'â€”'}</b>
            </div>
            <div>
              <span>Date</span>
              <b>{form.date}</b>
            </div>
            <div>
              <span>Currency / Rate</span>
              <b>
                {form.currency} / {form.exchangeRate}
              </b>
            </div>
            <div>
              <span>Invoice</span>
              <b>{form.invoice || 'â€”'}</b>
            </div>
            <div>
              <span>Status</span>
              <b>{form.status}</b>
            </div>
          </div>
        </section>
        <section className="card section">
          <div className="section-title">
            <span>2</span>
            <div>
              <h2>Shipment products</h2>
              <p>Add each product in this shipment one by one with buying and selling prices</p>
            </div>
            <Button variant="secondary" onClick={addItem}>
              <Plus size={17} />
              Add product
            </Button>
          </div>
          {form.items.length === 0 ? (
            <div className="empty">No products added yet.</div>
          ) : (
            <div className="table-wrap editable input-products">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Weight</th>
                    <th>Volume</th>
                    <th>Retail price</th>
                    <th>Wholesale</th>
                    <th>Purchase cost</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {calc.items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={item.productId}
                          onChange={e => {
                            const p = data.products.find(x => x.id === e.target.value);
                            setItem(i, 'productId', e.target.value);
                            setTimeout(
                              () =>
                                setForm(f => ({
                                  ...f,
                                  items: f.items.map((x, j) =>
                                    j === i ? { ...x, weight: p.weight, volume: p.volume } : x,
                                  ),
                                })),
                              0,
                            );
                          }}
                        >
                          {data.products.map(p => (
                            <option value={p.id} key={p.id}>
                              {p.code} â€” {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      {[
                        'quantity',
                        'unitPrice',
                        'weight',
                        'volume',
                        'retailPrice',
                        'wholesalePrice',
                      ].map(k => (
                        <td key={k}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item[k]}
                            onChange={e => setItem(i, k, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        <b>{money(item.purchaseCost)}</b>
                      </td>
                      <td>
                        <button
                          className="icon-btn danger"
                          onClick={() =>
                            change(
                              'items',
                              form.items.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card section">
          <div className="section-title">
            <span>3</span>
            <div>
              <h2>Additional costs & allocation</h2>
              <p>Shared expenses distributed across products</p>
            </div>
            <Button variant="secondary" onClick={addCost}>
              <Plus size={17} />
              Add cost
            </Button>
          </div>
          {form.costs.length === 0 ? (
            <div className="empty">No additional costs.</div>
          ) : (
            <>
              <div className="cost-inputs">
                {form.costs.map((cost, i) => (
                  <div className="cost-row" key={i}>
                    <Field label="Cost type">
                      <select
                        value={cost.type}
                        onChange={e =>
                          change(
                            'costs',
                            form.costs.map((x, j) =>
                              j === i ? { ...x, type: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        {data.costTypes.map(x => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Amount">
                      <input
                        type="number"
                        min="0"
                        value={cost.amount}
                        onChange={e =>
                          change(
                            'costs',
                            form.costs.map((x, j) =>
                              j === i ? { ...x, amount: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Allocate by">
                      <select
                        value={cost.method}
                        onChange={e =>
                          change(
                            'costs',
                            form.costs.map((x, j) =>
                              j === i ? { ...x, method: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        <option value="value">Product value</option>
                        <option value="quantity">Quantity</option>
                        <option value="weight">Weight</option>
                        <option value="volume">Volume</option>
                      </select>
                    </Field>
                    <button
                      className="icon-btn danger"
                      onClick={() =>
                        change(
                          'costs',
                          form.costs.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
              <div className="print-costs table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cost type</th>
                      <th>Amount</th>
                      <th>Allocation method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.costs.map((c, i) => (
                      <tr key={i}>
                        <td>{c.type}</td>
                        <td>{money(c.amount)}</td>
                        <td>{c.method === 'value' ? 'Product value' : c.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
        <section className="card section results">
          <div className="section-title">
            <span>4</span>
            <div>
              <h2>Landed cost, selling prices & profitability</h2>
              <p>Complete calculated result per product</p>
            </div>
          </div>
          <div className="summary-strip">
            <div>
              <span>Purchase total</span>
              <b>{money(calc.purchaseTotal)}</b>
            </div>
            <div>
              <span>Additional costs</span>
              <b>{money(calc.additionalTotal)}</b>
            </div>
            <div className="grand">
              <span>Total landed cost</span>
              <b>{money(calc.landedTotal)}</b>
            </div>
          </div>
          <div className="table-wrap">
            <table className="profit-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Purchase</th>
                  <th>Allocated</th>
                  <th>Total landed</th>
                  <th>Unit landed</th>
                  <th>Retail price</th>
                  <th>R profit</th>
                  <th>R markup</th>
                  <th>R margin</th>
                  <th>Wholesale</th>
                  <th>W profit</th>
                  <th>W markup</th>
                  <th>W margin</th>
                </tr>
              </thead>
              <tbody>
                {calc.items.map((x, i) => (
                  <tr key={i}>
                    <td>
                      <b>{data.products.find(p => p.id === x.productId)?.name}</b>
                      <small>{data.products.find(p => p.id === x.productId)?.code}</small>
                    </td>
                    <td>{x.quantity}</td>
                    <td>{money(x.purchaseCost)}</td>
                    <td>{money(x.allocatedCost)}</td>
                    <td>{money(x.totalLandedCost)}</td>
                    <td>
                      <b>{money(x.unitLandedCost)}</b>
                    </td>
                    <td>{money(x.retailPrice)}</td>
                    <td className={x.pricing.retail.profit >= 0 ? 'positive' : 'negative'}>
                      {money(x.pricing.retail.profit)}
                    </td>
                    <td>{x.pricing.retail.markup.toFixed(1)}%</td>
                    <td>{x.pricing.retail.margin.toFixed(1)}%</td>
                    <td>{money(x.wholesalePrice)}</td>
                    <td className={x.pricing.wholesale.profit >= 0 ? 'positive' : 'negative'}>
                      {money(x.pricing.wholesale.profit)}
                    </td>
                    <td>{x.pricing.wholesale.markup.toFixed(1)}%</td>
                    <td>{x.pricing.wholesale.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </fieldset>
    </>
  );
}

function ProductPrintReport({ item, product, breakdown }) {
  return (
    <article className="product-print-report">
      <header>
        <div className="report-logo">SG</div>
        <div>
          <h1>SUPUN GROUP OF COMPANIES</h1>
          <p>Product Costing & Pricing Report</p>
        </div>
        <span>CONFIDENTIAL</span>
      </header>
      <div className="report-title">
        <div>
          <small>PRODUCT CODE</small>
          <h2>{product?.code}</h2>
        </div>
        <div>
          <small>PRODUCT NAME</small>
          <h2>{product?.name}</h2>
        </div>
        <div>
          <small>PRINTED DATE</small>
          <h2>{new Date().toLocaleDateString()}</h2>
        </div>
      </div>
      <section>
        <h3>Product information</h3>
        <div className="report-facts">
          <div>
            <span>Category</span>
            <b>{product?.category || 'â€”'}</b>
          </div>
          <div>
            <span>Product type</span>
            <b>{product?.type || 'â€”'}</b>
          </div>
          <div>
            <span>Quantity</span>
            <b>{item.quantity}</b>
          </div>
          <div>
            <span>Weight per unit</span>
            <b>{item.weight || 0} kg</b>
          </div>
          <div>
            <span>Volume per unit</span>
            <b>{item.volume || 0} mÂ³</b>
          </div>
          <div>
            <span>Supplier unit price</span>
            <b>{money(item.unitPrice)}</b>
          </div>
        </div>
      </section>
      <section>
        <h3>Cost composition</h3>
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
              <td>{money(item.purchaseCost)}</td>
            </tr>
            {breakdown.map((x, i) => (
              <tr key={i}>
                <td>{x.type} â€” allocated share</td>
                <td>{money(x.amount)}</td>
              </tr>
            ))}
            <tr className="report-total">
              <td>Total landed cost</td>
              <td>{money(item.totalLandedCost)}</td>
            </tr>
            <tr className="report-total unit">
              <td>Unit landed cost</td>
              <td>{money(item.unitLandedCost)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3>Selling price & profitability</h3>
        <table className="pricing-report">
          <thead>
            <tr>
              <th>Price level</th>
              <th>Selling price</th>
              <th>Profit / unit</th>
              <th>Markup</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>Retail</b>
              </td>
              <td>{money(item.retailPrice)}</td>
              <td>{money(item.pricing.retail.profit)}</td>
              <td>{item.pricing.retail.markup.toFixed(2)}%</td>
              <td>{item.pricing.retail.margin.toFixed(2)}%</td>
            </tr>
            <tr>
              <td>
                <b>Wholesale</b>
              </td>
              <td>{money(item.wholesalePrice)}</td>
              <td>{money(item.pricing.wholesale.profit)}</td>
              <td>{item.pricing.wholesale.markup.toFixed(2)}%</td>
              <td>{item.pricing.wholesale.margin.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer>
        <span>Generated by Supun Group Costing & Pricing Management System</span>
        <span>Authorized financial use only</span>
      </footer>
    </article>
  );
}
