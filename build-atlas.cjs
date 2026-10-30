const {designs,intersection}=require('./geometry-atlas.cjs');
function graph(name,lines){
 const ps=[],edges=new Set();function id(p){let i=ps.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1.2);if(i<0){i=ps.length;ps.push(p)}return i;}
 for(let j=0;j<lines.length;j++){
  const [a,b]=lines[j],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,chain=[a,b];
  for(const line of lines){for(const p of line){const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2;const d=Math.abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/Math.sqrt(l2);if(t>0&&t<1&&d<1.2)chain.push(p);}const p=intersection(lines[j],line);if(p)chain.push(p);}
  const ids=[...new Set(chain.sort((p,q)=>((p[0]-q[0])*dx+(p[1]-q[1])*dy)).map(id))];
  for(let k=1;k<ids.length;k++){const pair=[ids[k-1],ids[k]].sort((a,b)=>a-b);if(pair[0]!==pair[1])edges.add(pair.join(','));}
 }
 let es=[...edges].map(e=>e.split(',').map(Number));
 let changed=true;while(changed){changed=false;for(let v=0;v<ps.length;v++){
  const adj=es.filter(e=>e.includes(v));if(adj.length!==2)continue;const a=adj[0].find(i=>i!==v),b=adj[1].find(i=>i!==v),u=ps[a],w=ps[b],q=ps[v];const len=Math.hypot(u[0]-w[0],u[1]-w[1]);if(Math.abs((q[0]-u[0])*(w[1]-u[1])-(q[1]-u[1])*(w[0]-u[0]))/len>.2)continue;
  es=es.filter(e=>!e.includes(v));es.push([a,b]);changed=true;break;
 }}
 const active=[...new Set(es.flat())],map=new Map(active.map((v,i)=>[v,i]));const points=active.map(v=>[+(240+(ps[v][0]-100)*2.15).toFixed(2),+(200+(ps[v][1]-100)*1.95).toFixed(2)]);
 return {name,points,edges:es.map(e=>e.map(i=>map.get(i))),finishClosed:false};
}
const atlas=designs.map(([name,es])=>graph(name,es));
if(require.main===module)for(const g of atlas){let min=999;for(let i=0;i<g.points.length;i++)for(let j=i+1;j<g.points.length;j++)min=Math.min(min,Math.hypot(g.points[i][0]-g.points[j][0],g.points[i][1]-g.points[j][1]));const d=g.points.map(()=>0);g.edges.forEach(([a,b])=>{d[a]++;d[b]++});console.log(g.name,g.points.length,g.edges.length,Math.round(min),'odd',d.filter(x=>x%2).length);}
module.exports={atlas,graph};
