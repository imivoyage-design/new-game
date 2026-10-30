/* Deterministic geometric curriculum. All special constraints are derived from
   a complete witness and then independently replayed through the rule engine. */
const fs=require('fs'),M=require('./dist/mechanics.js'),{atlas}=require('./build-atlas.cjs');
const poly=(n,rx=165,ry=155)=>Array.from({length:n},(_,i)=>[+(240+rx*Math.cos(-Math.PI/2+i*2*Math.PI/n)).toFixed(2),+(200+ry*Math.sin(-Math.PI/2+i*2*Math.PI/n)).toFixed(2)]);
const loop=p=>p.map((_,i)=>[i,(i+1)%p.length]);
const shape=(name,points,edges)=>({name,points,edges:edges||loop(points),finishClosed:false});
const basics=[shape('三角形',[[240,50],[70,340],[410,340]]),shape('正方形',[[95,55],[385,55],[385,345],[95,345]]),shape('長方形',[[55,100],[425,100],[425,300],[55,300]]),shape('菱形',[[240,35],[400,200],[240,365],[80,200]]),shape('梯形',[[155,65],[325,65],[425,335],[55,335]]),shape('五邊形',poly(5)),shape('六邊形',poly(6)),shape('平行四邊形',[[160,65],[425,65],[320,335],[55,335]])];
const small=[shape('小屋',[[90,180],[240,45],[390,180],[390,340],[90,340]],[[0,1],[1,2],[2,0],[0,4],[4,3],[3,2]]),shape('蝴蝶結',[[240,200],[65,65],[65,335],[415,65],[415,335]],[[0,1],[1,2],[2,0],[0,3],[3,4],[4,0]]),shape('雙菱形',[[240,35],[85,120],[240,205],[395,120],[85,290],[240,375],[395,290]],[[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6],[6,2],[0,2]]),shape('信封',[[85,75],[395,75],[395,325],[85,325]],[[0,1],[1,2],[2,3],[3,0],[0,2]])];
function bridge(seed){const n=5+seed%5,p=poly(n),g=shape(n===5?'五角星結':'六角星環',p,[...loop(p),...p.map((_,i)=>[i,(i+2)%n])]);if(n===6)g.edges=g.edges.filter(([a,b],i,es)=>es.findIndex(([c,d])=>a===c&&b===d||a===d&&b===c)===i);g.bridge=true;return g;}
function portal(seed,lesson=-1){
 const motifs=[basics[0],basics[1],basics[5],basics[6],small[1],small[2],small[0]],pair=lesson<0?[seed%motifs.length,Math.floor(seed/7)%motifs.length]:[[0,0],[1,0],[0,2],[2,1],[4,1]][lesson],left=motifs[pair[0]],right=motifs[pair[1]];
 const p=left.points.map(([x,y])=>[+(126+(x-240)*.43).toFixed(2),+(200+(y-200)*.82).toFixed(2)]),q=right.points.map(([x,y])=>[+(354+(x-240)*.43).toFixed(2),+(200+(y-200)*.82).toFixed(2)]),n=p.length;
 return {...shape(left.name+'・'+right.name+'星門',p.concat(q),left.edges.concat(right.edges.map(e=>e.map(v=>v+n)))),portals:[[seed%n,n+Math.floor(seed/11)%q.length]]};
}
function euler(g,seed){
 const degree=g.points.map(()=>0),copies=[],adj=g.points.map(()=>[]);g.edges.forEach(([a,b],i)=>{for(let j=0;j<M.quota(g,i);j++){const k=copies.length;copies.push(i);adj[a].push([b,k]);adj[b].push([a,k]);degree[a]++;degree[b]++;}});
 const odd=degree.map((d,i)=>d%2?i:-1).filter(i=>i>=0);if(odd.length!==0&&odd.length!==2)return null;
 const start=odd.length?odd[seed%2]:seed%g.points.length;for(const ns of adj)ns.sort((a,b)=>(a[1]*17+seed*13)%101-(b[1]*17+seed*13)%101);
 const used=new Set(),stack=[[start,-1]],out=[];while(stack.length){const [v]=stack.at(-1),e=adj[v].find(x=>!used.has(x[1]));if(e){used.add(e[1]);stack.push(e)}else out.push(stack.pop()[1]);}if(used.size!==copies.length)return null;
 return {start,edges:out.reverse().slice(1).map(k=>copies[k])};
}
function basePlan(g,seed,red){
 if(g.portals){if(red){for(let i=0;i<g.edges.length;i++){g.doubleEdges=[(i+seed)%g.edges.length];const p=M.solve(g);if(p)return p;}throw Error('portal red');}return M.solve(g);}
 if(!red){const p=euler(g,seed);if(!p)throw Error('base parity');return p;}
 const attempts=[];for(let i=0;i<g.edges.length;i++)attempts.push([i]);for(let i=0;i<g.edges.length;i++)for(let j=i+1;j<g.edges.length;j++)attempts.push([i,j]);for(const ds of attempts.slice(seed%attempts.length).concat(attempts.slice(0,seed%attempts.length))){g.doubleEdges=ds;const p=euler(g,seed);if(p)return p;}throw Error('red parity');
}
const labels={start:'START 起點',arrow:'單向箭頭',red:'紅線雙程',bridge:'立交橋',flip:'方向翻轉',portal:'成對傳送門',order:'順序檢查點',key:'鑰匙與鎖線',color:'雙色切換',once:'單次轉向'};
const chapterMechanics=['START 起點 / 單向箭頭','紅線雙程 / 立交橋','方向翻轉','成對傳送門','順序檢查點','鑰匙與鎖線','雙色切換','單次轉向'];
function featureList(n){const c=Math.floor(n/25),j=n%25;if(c===0)return j<8?[]:j<15?['start']:j<20?['arrow']:['start','arrow'];if(c===1)return j<5?['red']:j<10?['red','start']:j<15?['bridge']:['bridge','red',...(j>19?['arrow','start']:[])];const f=['flip','portal','order','key','color','once'][c-2];if(j<5)return [f];const extra=[[],['start'],['arrow'],['red'],['start','arrow'],['start','red']][j%6];return [f,...extra,...(c>=4&&j>14?[(j%2?'flip':'order')].filter(x=>x!==f):[])];}
function trace(g,p){let s=M.initial(g,p.start),out=[];for(const i of p.edges){const [a,b]=g.edges[i],entry=a===s.current?b:a;out.push({i,from:s.current,to:entry,before:s});s=M.step(g,s,i);if(!s)throw Error('trace');}return out;}
function decorate(g,p,features,seed){
 let tr=trace(g,p);const unique=tr.filter(t=>tr.filter(x=>x.i===t.i).length===1);
 if(features.includes('start'))g.start=p.start;
 if(features.includes('order')){const seen=new Set([p.start]),first=tr.map(t=>t.to).filter(v=>{if(seen.has(v))return false;seen.add(v);return true;});g.checkpoints=first.slice(seed%Math.max(1,first.length-1),seed%Math.max(1,first.length-1)+2+Math.floor(seed/4)%2);}
 if(features.includes('key')){const t=tr[seed%Math.max(1,tr.length-3)];g.keys={[t.to]:'K'};const at=tr.findIndex(x=>x.to===t.to);const lock=unique.find(x=>tr.indexOf(x)>at+1);if(!lock)throw Error('key placement');g.locks={[lock.i]:'K'};}
 for(const kind of ['flip','once'])if(features.includes(kind)){const once=kind==='once',taken=new Set([g.start,...(g.checkpoints||[]),...Object.keys(g.keys||{}).map(Number),...(g.switchNodes||[])]),pool=tr.slice(0,Math.max(1,Math.floor(tr.length/2))).filter(t=>!taken.has(t.to));if(!pool.length)throw Error('node space');const v=pool[seed%pool.length].to;g[once?'onceNodes':'switchNodes']=[v];const candidate=unique.find(t=>tr.indexOf(t)>tr.findIndex(t=>t.to===v)&&!g.dynamicEdges?.[t.i]);if(!candidate)throw Error('switch placement');let parity=0;for(const t of tr){if(t.i===candidate.i)break;if(t.to===v)parity=once?1:parity^1;}g[once?'onceEdges':'dynamicEdges']={[candidate.i]:parity?[candidate.to,candidate.from]:[candidate.from,candidate.to]};}
 if(features.includes('color')){const taken=new Set([g.start,...(g.checkpoints||[]),...(g.switchNodes||[])]),pool=tr.slice(0,Math.max(1,Math.floor(tr.length/2))).filter(t=>!taken.has(t.to));if(!pool.length)throw Error('color space');const v=pool[seed%pool.length].to;g.colorSwitches=[v];g.colorEdges={};let color='R';for(const t of tr){if(unique.includes(t))g.colorEdges[t.i]=color;if(t.to===v)color=color==='R'?'B':'R';}if(!Object.values(g.colorEdges).includes('B'))throw Error('color placement');}
 if(features.includes('arrow')){g.oneWay={};for(const t of unique.slice(seed%Math.max(1,unique.length-2))){if(g.dynamicEdges?.[t.i]||g.onceEdges?.[t.i])continue;g.oneWay[t.i]=[t.from,t.to];if(Object.keys(g.oneWay).length>=(g.edges.length<8?1:2+seed%2))break;}}
 const marked=[...(g.start===undefined?[]:[g.start]),...(g.checkpoints||[]),...Object.keys(g.keys||{}).map(Number),...(g.switchNodes||[]),...(g.onceNodes||[]),...(g.colorSwitches||[]),...(g.portals||[]).flat()];if(new Set(marked).size!==marked.length)throw Error('ambiguous stacked node icons');
 if(!M.validate(g,p))throw Error('decorated witness');g.solution=p;return g;
}
const levels=[],seen=new Set();
for(let n=0;n<200;n++){const features=featureList(n),chapter=Math.floor(n/25),j=n%25;let chosen;
 for(let attempt=0;attempt<180&&!chosen;attempt++){const seed=n+attempt*13;let g;
 if(features.includes('portal'))g=portal(seed,j<5?j:-1);
 else if(features.includes('bridge'))g=bridge(seed);
 else if(n<8)g=basics[n];
 else if(n<25)g=[...basics,...small][(n+attempt)%12];
 else if(j<5)g=small[(j+attempt)%small.length];
 else {const motifs=chapter<3?[atlas[0],atlas[1],atlas[5],atlas[8],...small]:[...atlas,...small];g=motifs[(n+attempt)%motifs.length];}
 g=JSON.parse(JSON.stringify(g));
 try{const p=basePlan(g,seed,features.includes('red'));g=decorate(g,p,features,seed);const sig=JSON.stringify([g.name,g.points,g.edges,g.start,g.doubleEdges,g.oneWay,g.dynamicEdges,g.switchNodes,g.onceNodes,g.onceEdges,g.checkpoints,g.keys,g.locks,g.colorEdges,g.colorSwitches,g.portals]);if(seen.has(sig)&&n>=8)continue;seen.add(sig);chosen=g;}catch(e){}
 }
 if(!chosen)throw Error('No stage '+(n+1)+' '+features);
 chosen.id='dream-'+String(n+1).padStart(3,'0');chosen.chapter=chapter+1;chosen.mechanisms=features;chosen.phase=n<8?'基本操作':j<5||n===8||n===15||n===35?'新機制教學':j<15?'獨立練習':'組合挑戰';chosen.difficultyLabel=chosen.phase;
 const rules=[];if(features.includes('start'))rules.push('從 S 起筆');if(features.includes('arrow'))rules.push('箭頭只能順向');if(features.includes('red'))rules.push('紅線 ×2 走兩次；折返也計次，B 撤回');if(features.includes('bridge'))rules.push('橋拱交叉不相通');if(features.includes('flip'))rules.push('每次到達 ↻ 綠點，綠箭頭反向');if(features.includes('portal'))rules.push('到達 P 傳送至配對點；按住移到出口續畫');if(features.includes('order'))rules.push('首次到達須依 A → B → C');if(features.includes('key'))rules.push('先取 K，再走鎖線');if(features.includes('color'))rules.push('到達 ◐ 換色，只能走當前色通道');if(features.includes('once'))rules.push('首次到達 ①，金箭頭反向一次');chosen.ruleText=rules.join(' · ')||'按住圓點，一筆連完所有線段';levels.push(chosen);
}
fs.writeFileSync('dist/levels.js','const CHAPTER_MECHANICS='+JSON.stringify(chapterMechanics)+';\nconst DEMO_LEVELS='+JSON.stringify(levels)+';\nif(typeof module!=="undefined")module.exports=DEMO_LEVELS;\n');
console.log('Generated '+levels.length+' validated stages.');
