import { useMemo } from 'react';
import { Download, Printer, FileSpreadsheet, History, ChartNoAxesCombined } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, PageHeader } from '../components/UI';
import { calculateCosting, money } from '../utils/calculations';
export default function Reports() {
  const { data } = useApp();
  const costings = useMemo(() => data.costings.map(calculateCosting), [data.costings]);
  const csv = () => {
    const rows = [
      [
        'Reference',
        'Date',
        'Supplier',
        'Purchase Total',
        'Additional Costs',
        'Landed Total',
        'Status',
      ],
      ...costings.map(c => [
        c.reference,
        c.date,
        data.suppliers.find(s => s.id === c.supplierId)?.name,
        c.purchaseTotal,
        c.additionalTotal,
        c.landedTotal,
        c.status,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(x => `"${x ?? ''}"`).join(',')).join('\n')], {
      type: 'text/csv',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'supun-costing-report.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <PageHeader
        eyebrow="FINANCIAL REPORTING"
        title="Reports"
        description="Review, print and export costing intelligence."
        action={
          <div className="action-row">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={17} />
              Print
            </Button>
            <Button onClick={csv}>
              <Download size={17} />
              Export CSV
            </Button>
          </div>
        }
      />
      <div className="report-cards">
        <div className="report-card">
          <FileSpreadsheet />
          <div>
            <h3>Complete costing report</h3>
            <p>All shipment totals and current statuses.</p>
          </div>
          <Button variant="secondary" onClick={csv}>
            Download
          </Button>
        </div>
        <div className="report-card">
          <History />
          <div>
            <h3>Product cost history</h3>
            <p>Historical landed costs by product and date.</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            View
          </Button>
        </div>
        <div className="report-card">
          <ChartNoAxesCombined />
          <div>
            <h3>Margin report</h3>
            <p>Retail and wholesale profitability overview.</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            View
          </Button>
        </div>
      </div>
      <div className="card report-table">
        <div className="card-title">
          <div>
            <h2>Costing summary</h2>
            <p>Financial value across every saved costing</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Purchase total</th>
                <th>Additional costs</th>
                <th>Landed total</th>
                <th>Increase</th>
              </tr>
            </thead>
            <tbody>
              {costings.map(c => (
                <tr key={c.id}>
                  <td>
                    <b>{c.reference}</b>
                  </td>
                  <td>{c.date}</td>
                  <td>{money(c.purchaseTotal)}</td>
                  <td>{money(c.additionalTotal)}</td>
                  <td>
                    <b>{money(c.landedTotal)}</b>
                  </td>
                  <td>
                    {c.purchaseTotal ? ((c.additionalTotal / c.purchaseTotal) * 100).toFixed(1) : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
