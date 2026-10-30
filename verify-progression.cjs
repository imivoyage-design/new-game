const assert=require('assert/strict'),levels=require('./dist/levels.js');
assert.equal(levels.length,200);const first={start:9,arrow:16,red:26,bridge:36,flip:51,portal:76,order:101,key:126,color:151,once:176};
for(const [f,n] of Object.entries(first)){assert.equal(levels.findIndex(g=>g.mechanisms.includes(f))+1,n);assert.deepEqual(levels[n-1].mechanisms,[f]);}
assert.deepEqual(levels.slice(0,8).map(g=>g.name),['三角形','正方形','長方形','菱形','梯形','五邊形','六邊形','平行四邊形']);
for(const [i,g] of levels.entries()){
 assert.equal(g.chapter,1+Math.floor(i/25));assert(g.id);for(const f of g.mechanisms)assert(i+1>=first[f]);
 if(i<8)assert.equal(g.mechanisms.length,0);
 if(i<25){assert(g.points.length<=7);assert(g.edges.length<=12);assert(!g.doubleEdges?.length);assert(!g.switchNodes);}
 if(i<75){assert(g.points.length<=12);assert(g.edges.length<=24);}
 if(g.doubleEdges?.length)assert(g.mechanisms.includes('red'));
 if(g.mechanisms.includes('flip'))assert(g.switchNodes?.length&&Object.keys(g.dynamicEdges).length);
 if(g.mechanisms.includes('once'))assert(g.onceNodes?.length&&Object.keys(g.onceEdges).length);
}
assert(levels.slice(75).some(g=>g.points.length>20));
console.log('PASS: 8 chapters × 25; 10 separately taught mechanisms; 8 basic opening shapes; no future mechanics used to repair parity; first-chapter readability.');
