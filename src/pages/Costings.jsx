import {useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Eye,Plus} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {Badge,Button,PageHeader,SearchBox} from '../components/UI';
import {calculateCosting,money} from '../utils/calculations';

const profitability=c=>{
  const retail=c.items.reduce((s,i)=>s+(Number(i.retailPrice)||0)*(Number(i.quantity)||0),0);
  const wholesale=c.items.reduce((s,i)=>s+(Number(i.wholesalePrice)||0)*(Number(i.quantity)||0),0);
  const metric=sales=>({sales,markup:c.landedTotal?(sales-c.landedTotal)/c.landedTotal*100:0,margin:sales?(sales-c.landedTotal)/sales*100:0});
  return {retail:metric(retail),wholesale:metric(wholesale)};
};

export default function Costings(){
  const {data}=useApp(),nav=useNavigate();
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('All');
  const list=useMemo(()=>data.costings.map(c=>{const calculated=calculateCosting(c);return {...calculated,summary:profitability(calculated)}}).filter(c=>(status==='All'||c.status===status)&&(c.reference+c.id).toLowerCase().includes(q.toLowerCase())),[data.costings,q,status]);
  return <><PageHeader eyebrow="COST MANAGEMENT" title="Costings" description="Create, review and finalize shipment landed costs." action={<Button onClick={()=>nav('/costings/new')}><Plus size={18}/>New costing</Button>}/><div className="card"><div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search reference or costing ID..."/><div className="filter-pills">{['All','Draft','Under Review','Finalized'].map(x=><button key={x} className={status===x?'active':''} onClick={()=>setStatus(x)}>{x}</button>)}</div></div><div className="table-wrap"><table className="costings-table"><thead><tr><th>Costing</th><th>Supplier</th><th>Date</th><th>Items</th><th>Landed cost</th><th>Selling value</th><th>Markup</th><th>Margin</th><th>Status</th><th>Action</th></tr></thead><tbody>{list.map(c=><tr key={c.id}><td><b>{c.reference}</b><small>{c.id}</small></td><td>{data.suppliers.find(s=>s.id===c.supplierId)?.name}</td><td>{c.date}</td><td>{c.items.length}</td><td><b>{money(c.landedTotal)}</b><small>Purchase {money(c.purchaseTotal)}</small></td><td><b>{money(c.summary.retail.sales)}</b><small>Wholesale {money(c.summary.wholesale.sales)}</small></td><td><b>R {c.summary.retail.markup.toFixed(1)}%</b><small>W {c.summary.wholesale.markup.toFixed(1)}%</small></td><td><b>R {c.summary.retail.margin.toFixed(1)}%</b><small>W {c.summary.wholesale.margin.toFixed(1)}%</small></td><td><Badge>{c.status}</Badge></td><td><Button variant="secondary" onClick={()=>nav(`/costings/${c.id}`)}><Eye size={16}/>View</Button></td></tr>)}</tbody></table></div></div></>
}
