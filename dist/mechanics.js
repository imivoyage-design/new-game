/* Pure rule engine: UI, hints, generators and tests share these transitions. */
(function(root){
'use strict';
const quota=(g,i)=>(g.doubleEdges||[]).includes(i)?2:1;
function arrive(g,s,v){
 const at=(g.checkpoints||[]).indexOf(v);
 if(at>=s.checkpoint&&at!==s.checkpoint)return null;
 if(at===s.checkpoint)s.checkpoint++;
 if((g.switchNodes||[]).includes(v))s.flip^=1;
 if((g.onceNodes||[]).includes(v)&&!s.triggered.includes(v)){s.triggered.push(v);s.once^=1;}
 if((g.colorSwitches||[]).includes(v))s.color=s.color==='R'?'B':'R';
 if(g.keys?.[v]&&!s.keys.includes(g.keys[v]))s.keys.push(g.keys[v]);
 s.visited.push(v);return s;
}
function initial(g,start){
 if(!g.points[start]||(g.start!==undefined&&g.start!==start))return null;
 const s={start,current:start,counts:g.edges.map(()=>0),flip:0,once:0,triggered:[],keys:[],color:g.initialColor||'R',checkpoint:0,visited:[start],steps:0};
 // Starting is not an arrival; only pickup and ordered checkpoint apply here.
 if(g.keys?.[start])s.keys.push(g.keys[start]);
 const at=(g.checkpoints||[]).indexOf(start);if(at>0)return null;if(at===0)s.checkpoint=1;
 return s;
}
function direction(g,i,s){const d=g.dynamicEdges?.[i]||g.onceEdges?.[i]||g.oneWay?.[i];if(!d)return null;const flip=g.dynamicEdges?.[i]?s.flip:g.onceEdges?.[i]?s.once:0;return flip?[d[1],d[0]]:d;}
function reason(g,s,i){
 if(!s)return '請從 START 出發';
 const e=g.edges[i];if(!e||!e.includes(s.current))return '請沿相連的線段走';
 if(s.counts[i]>=quota(g,i))return '這條線已經完成';
 const next=e[0]===s.current?e[1]:e[0],d=direction(g,i,s);
 if(d&&d[0]!==s.current)return '這條線只能順箭頭走';
 if(g.locks?.[i]&&!s.keys.includes(g.locks[i]))return '先取得 K 鑰匙，再通過鎖線';
 if(g.colorEdges?.[i]&&g.colorEdges[i]!==s.color)return '先到 ◐ 切換通道顏色';
 const at=(g.checkpoints||[]).indexOf(next);if(at>s.checkpoint)return '檢查點須依 A → B → C 順序';
 return '';
}
function step(g,s,i){
 if(reason(g,s,i))return null;
 const e=g.edges[i],entry=e[0]===s.current?e[1]:e[0],n={...s,counts:s.counts.slice(),keys:s.keys.slice(),triggered:s.triggered.slice(),visited:s.visited.slice()};
 n.counts[i]++;n.steps++;if(!arrive(g,n,entry))return null;
 n.current=entry;
 const pair=(g.portals||[]).find(p=>p.includes(entry));
 if(pair){n.current=pair[0]===entry?pair[1]:pair[0];if(!arrive(g,n,n.current))return null;}
 return n;
}
function complete(g,s){return !!s&&s.counts.every((n,i)=>n===quota(g,i))&&s.checkpoint===(g.checkpoints||[]).length&&(g.finishClosed!==true||s.current===s.start);}
function replay(g,plan){let s=initial(g,plan?.start);if(!s)return null;for(const i of plan.edges){s=step(g,s,i);if(!s)return null;}return s;}
function validate(g,plan){return complete(g,replay(g,plan));}
function solve(g,start){
 if(g.solution&&(start===undefined||g.solution.start===start)&&validate(g,g.solution))return JSON.parse(JSON.stringify(g.solution));
 const starts=start===undefined?(g.start===undefined?g.points.map((_,i)=>i):[g.start]):[start];let budget=250000;
 for(const v of starts){const s=initial(g,v);if(!s)continue;const failed=new Set(),path=[];
 function visit(s){if(complete(g,s))return true;if(--budget<0)return false;
 const key=[s.current,s.flip,s.once,s.triggered.join(','),s.keys.join(','),s.color,s.checkpoint,s.counts.join('')].join(':');if(failed.has(key))return false;
 for(let i=0;i<g.edges.length;i++){const n=step(g,s,i);if(!n)continue;path.push(i);if(visit(n))return true;path.pop();}failed.add(key);return false;}
 if(visit(s))return {start:v,edges:path.slice()};}
 return null;
}
const api={quota,initial,direction,reason,step,complete,replay,solve,validate};if(typeof module!=='undefined')module.exports=api;else root.LineMechanics=api;
})(typeof window!=='undefined'?window:globalThis);
