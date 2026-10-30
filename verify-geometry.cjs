const assert=require('node:assert/strict'),levels=require('./dist/levels.js'),M=require('./dist/mechanics.js');
const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
const signatures=new Set();let markedCrossings=0;
for(const [n,g] of levels.entries()){
 const marked=[...(g.start===undefined?[]:[g.start]),...(g.checkpoints||[]),...Object.keys(g.keys||{}).map(Number),...(g.switchNodes||[]),...(g.onceNodes||[]),...(g.colorSwitches||[]),...(g.portals||[]).flat()];assert.equal(new Set(marked).size,marked.length,'stacked icons '+n);
 assert(M.validate(g,g.solution),'solution '+(n+1));
 const signature=JSON.stringify([g.points,g.edges,g.start,g.doubleEdges,g.switchNodes,g.dynamicEdges,g.onceNodes,g.onceEdges,g.oneWay,g.checkpoints,g.keys,g.locks,g.colorSwitches,g.colorEdges,g.portals]);assert(!signatures.has(signature),'duplicate stage '+n);signatures.add(signature);
 const adj=g.points.map(()=>[]);g.edges.forEach(([a,b])=>{assert(a!==b);adj[a].push(b);adj[b].push(a)});
 for(let v=0;v<adj.length;v++){assert(adj[v].length>=2,'dangling branch '+n);if(adj[v].length===2){const[a,b]=adj[v];const d=Math.abs(cross(g.points[a],g.points[b],g.points[v]))/Math.hypot(g.points[a][0]-g.points[b][0],g.points[a][1]-g.points[b][1]);assert(d>5,'straight filler '+n+':'+v);}}
 for(const [j,[a,b]]of g.edges.entries()){
  const u=g.points[a],v=g.points[b],len=Math.hypot(v[0]-u[0],v[1]-u[1]);assert(len>=34,'short edge '+n);
  for(let k=0;k<g.points.length;k++){if(k===a||k===b)continue;const q=g.points[k],t=((q[0]-u[0])*(v[0]-u[0])+(q[1]-u[1])*(v[1]-u[1]))/(len*len);assert(!(t>0&&t<1&&Math.abs(cross(u,v,q))/len<18),'occluded node '+n+':'+k);}
  for(const[c,d]of g.edges.slice(j+1)){assert(!(a===c&&b===d||a===d&&b===c),'duplicate edge '+n);if(new Set([a,b,c,d]).size<4)continue;if(cross(u,v,g.points[c])*cross(u,v,g.points[d])<0&&cross(g.points[c],g.points[d],u)*cross(g.points[c],g.points[d],v)<0){assert(g.bridge,'unmarked crossing '+n);markedCrossings++;}}
 }
}
console.log('PASS: 200 distinct configurations and legal solutions; closed silhouettes; no filler, hidden overlap or occluded nodes; '+markedCrossings+' bridge crossings explicitly marked.');
