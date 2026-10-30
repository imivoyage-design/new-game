const vm=require('vm'),fs=require('fs'),assert=require('assert'),M=require('./dist/mechanics.js');
class El{constructor(){this.textContent='';this.style={};this.attrs={};this.events={};this.classList={add(){},remove(){}}}setAttribute(k,v){this.attrs[k]=v}append(){}replaceChildren(){}addEventListener(k,f){this.events[k]=f}getBoundingClientRect(){return {left:0,top:0,width:Number(process.env.BOARD_WIDTH)||480,height:(Number(process.env.BOARD_WIDTH)||480)*400/480}}setPointerCapture(){}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}}
const els={};const $=q=>els[q]??=new El();let data={[process.env.LEGACY_PROGRESS?'one-line-v1':'kirby-line-demo-v1']:JSON.stringify({...(process.env.LEGACY_PROGRESS?{}:{puzzleSet:'geometric-v2'}),completed:Array.from({length:15},(_,i)=>i),sound:true,haptics:false})},interval;
const ctx={LineMechanics:M,console,document:{querySelector:$,createElementNS:()=>new El(),addEventListener(){}},window:{addEventListener(){},scrollTo(){}},navigator:{},performance:{now:()=>100},localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v},setInterval:f=>(interval=f,1),clearInterval:()=>interval=null,requestAnimationFrame:()=>1,matchMedia:()=>({matches:true}),HTMLInputElement:class{},HTMLTextAreaElement:class{}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/levels.js','utf8'),ctx);
let src=fs.readFileSync('dist/game.js','utf8'),end=src.lastIndexOf('}');src=src.slice(0,end)+"globalThis.test={load,reset,undoStep,get:()=>({state,won,pointer,current,completed:completed.size,steps:history.length,portalPending,offTrack,rejoinAtNode,previewPoint:preview?.point}),levels,solve};"+src.slice(end);vm.runInContext(src,ctx);const t=ctx.test;
assert.equal(t.get().completed,15);assert.equal($('#levelNo').textContent,'16');assert(data['kirby-line-archive-v1']);
function event(p){return {button:0,pointerType:process.env.INPUT_TYPE||'touch',pointerId:1,clientX:p[0]*(Number(process.env.BOARD_WIDTH)||480)/480,clientY:p[1]*(Number(process.env.BOARD_WIDTH)||480)/480,preventDefault(){}}}
const board=$('#board');
function start(g){board.events.pointerdown(event(g.points[g.solution.start]));}
function move(g,i){const before=t.get().state,[a,b]=g.edges[i],entry=a===before.current?b:a;board.events.pointermove(event(g.points[entry]));if(t.get().portalPending&&!t.get().won)board.events.pointermove(event(g.points[t.get().current]));}
for(let i=0;i<t.levels.length;i++){
 t.load(i);const g=t.levels[i],p=t.solve(g);assert(M.validate(g,p),'witness '+i);start(g);
 let expected=M.initial(g,p.start);
 for(let j=0;j<p.edges.length;j++){move(g,p.edges[j]);expected=M.step(g,expected,p.edges[j]);assert.deepEqual(JSON.parse(JSON.stringify(t.get().state)),expected,'drag state '+(i+1)+':'+j);}
 assert(t.get().won,'completion '+i);board.events.pointerup(event(g.points[t.get().current]));assert(t.get().won,'release after win');
}
assert.equal(t.get().completed,200);
for(let n=0;n<200;n++){
 t.load(n);const g=t.levels[n],p=t.solve(g);start(g);const initial=JSON.stringify(t.get().state);
 for(const i of p.edges.slice(0,Math.min(5,p.edges.length-1)))move(g,i);
 while(t.get().steps)t.undoStep();assert.equal(JSON.stringify(t.get().state),initial,'undo all state '+n);
 board.events.pointerup(event(g.points[t.get().current]));assert.equal(t.get().pointer,null);
}
for(const g of t.levels.filter(g=>g.start!==undefined)){t.load(t.levels.indexOf(g));const wrong=g.points.findIndex((_,i)=>i!==g.start);board.events.pointerdown(event(g.points[wrong]));assert.equal(t.get().pointer,null);}
t.load(15);$('#hint').onclick();assert(interval);interval();t.reset();assert(!interval);
const stored=JSON.parse(data['kirby-line-demo-v1']);assert.equal(stored.puzzleSet,'dream-v3');assert(stored.completed.every(x=>x.startsWith('dream-')));assert.equal(stored.sound,true);assert.equal(stored.haptics,false);
console.log('PASS: 200 drag completions, 200 full-state undo checks, wrong START blocking, hints, release and progress migration; width '+(process.env.BOARD_WIDTH||480)+' '+(process.env.INPUT_TYPE||'touch'));
// Rounded turns without touching exact centres, then physical back-drag undo.
for(const n of [0,1,3,t.levels.findIndex(g=>g.name==='小屋')]){
 t.load(n);const g=t.levels[n],p=g.solution;start(g);
 for(const i of p.edges){const s=t.get().state,[a,b]=g.edges[i],v=a===s.current?b:a,q=g.points[v];board.events.pointermove(event([q[0]+7,q[1]-6]));}
 assert(t.get().won,'rounded turn '+n);
}
t.load(1);{const g=t.levels[1],p=g.solution;start(g);move(g,p.edges[0]);move(g,p.edges[1]);assert.equal(t.get().steps,2);const back=g.edges[p.edges[1]].find(v=>v!==t.get().current);board.events.pointermove(event([g.points[back][0]+6,g.points[back][1]+6]));assert.equal(t.get().steps,1,'physical corner rewind');}
for(let n=15;n<20;n++){t.load(n);const g=t.levels[n];const [i,d]=Object.entries(g.oneWay)[0];board.events.pointerdown(event(g.points[d[1]]));board.events.pointermove(event(g.points[d[0]]));assert.equal(t.get().steps,0,'reverse arrow is blocked');assert.equal(t.get().current,d[1]);}
t.load(25);{const g=t.levels[25],i=g.doubleEdges[0],v=g.edges[i][0];board.events.pointerdown(event(g.points[v]));move(g,i);move(g,i);assert.equal(t.get().state.counts[i],2,'immediate red return counts');t.undoStep();assert.equal(t.get().state.counts[i],1,'B cancels red traversal');}
for(const n of [0,25,50,75,100,125,150,175,199]){t.load(n);$('#hint').onclick();let ticks=0;while(interval&&ticks++<200)interval();assert(!interval,'hint terminates');assert.equal(t.get().steps,0,'hints do not solve/save stage');}
console.log('PASS: rounded corners, physical rewind, reverse arrows, red immediate return versus B, complete hint playback for every mechanism.');
// Physical-pixel corridors and rejoining after a real off-line excursion.
const scale=480/(Number(process.env.BOARD_WIDTH)||480),offset=(process.env.INPUT_TYPE==='mouse'?23:28)*scale;
function along(a,b,t,n=0){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);return [a[0]+t*dx-n*dy/len,a[1]+t*dy+n*dx/len];}
t.load(1);{
 const g=t.levels[1],p=g.solution;start(g);const a=g.points[t.get().current],i=p.edges[0],b=g.points[g.edges[i].find(v=>v!==t.get().current)];
 // Choose the normal facing the inside of the square, away from its boundary.
 const mid=along(a,b,.5),normal=along(a,b,.5,1),sign=(normal[0]-mid[0])*(240-mid[0])+(normal[1]-mid[1])*(200-mid[1])>=0?1:-1;
 board.events.pointermove(event(along(a,b,.3,offset*sign)));assert(!t.get().offTrack,'physical side tolerance');
 board.events.pointermove(event(along(a,b,.6,offset*sign)));assert(!t.get().offTrack,'parallel off-centre drag');
 assert.equal(t.get().steps,0);assert.equal(t.get().pointer,1);board.events.pointermove(event(b));assert.equal(t.get().steps,1,'off-centre edge arrival');
 const from=g.points[t.get().current],next=p.edges[1],to=g.points[g.edges[next].find(v=>v!==t.get().current)];
 board.events.pointermove(event(along(from,to,.2)));const stateBefore=JSON.stringify(t.get().state);
 board.events.pointermove(event(along(from,to,.2,90*scale)));assert(t.get().offTrack,'outside corridor pauses');assert.equal(JSON.stringify(t.get().state),stateBefore,'off-line movement keeps progress');
 board.events.pointermove(event(along(from,to,.75)));assert(!t.get().offTrack,'rejoin farther along same edge');assert.equal(t.get().steps,1);assert(Math.hypot(t.get().previewPoint[0]-along(from,to,.75)[0],t.get().previewPoint[1]-along(from,to,.75)[1])<.01);
 board.events.pointermove(event(to));assert.equal(t.get().steps,2);t.undoStep();assert(t.get().rejoinAtNode);
 board.events.pointermove(event([to[0]+1,to[1]+1]));assert.equal(t.get().steps,1,'B does not immediately redraw');
 board.events.pointermove(event(from));assert(!t.get().rejoinAtNode);board.events.pointermove(event(to));assert.equal(t.get().steps,2,'continue after B rejoin');
}
console.log('PASS: physical-pixel side tolerance, off-line progress retention, rejoin later on same edge, and B cancellation without accidental redraw.');
