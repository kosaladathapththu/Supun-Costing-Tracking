export const n=v=>Number(v)||0;
export const money=(v,currency='LKR')=>new Intl.NumberFormat('en-LK',{style:'currency',currency,maximumFractionDigits:2}).format(n(v));
export const pct=v=>`${n(v).toFixed(2)}%`;
export function allocationWeights(items,method){
  const raw=items.map(i=>method==='quantity'?n(i.quantity):method==='weight'?n(i.weight)*n(i.quantity):method==='volume'?n(i.volume)*n(i.quantity):n(i.quantity)*n(i.unitPrice));
  const total=raw.reduce((a,b)=>a+b,0); return raw.map(v=>total?v/total:1/Math.max(items.length,1));
}
export function calculateCosting(costing){
  const items=costing.items||[], costs=costing.costs||[];
  const shares=items.map(()=>0);
  costs.forEach(cost=>{if(cost.method==='manual'){items.forEach((_,i)=>shares[i]+=n(cost.manual?.[i]));}else{allocationWeights(items,cost.method).forEach((w,i)=>shares[i]+=n(cost.amount)*w);}});
  const calculated=items.map((item,i)=>{const purchase=n(item.quantity)*n(item.unitPrice);const additional=shares[i];const total=purchase+additional;const unit=n(item.quantity)?total/n(item.quantity):0;const pricing={};['retail','wholesale'].forEach(k=>{const price=n(item[`${k}Price`]);pricing[k]={profit:price-unit,markup:unit?(price-unit)/unit*100:0,margin:price?(price-unit)/price*100:0};});return {...item,purchaseCost:purchase,allocatedCost:additional,totalLandedCost:total,unitLandedCost:unit,pricing};});
  return {...costing,items:calculated,purchaseTotal:calculated.reduce((s,i)=>s+i.purchaseCost,0),additionalTotal:costs.reduce((s,c)=>s+n(c.amount),0),landedTotal:calculated.reduce((s,i)=>s+i.totalLandedCost,0)};
}
export const uid=(prefix='ID')=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
