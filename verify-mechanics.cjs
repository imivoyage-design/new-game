const assert=require('assert/strict'),M=require('./dist/mechanics.js'),levels=require('./dist/levels.js');
const triangle={points:[[0,0],[1,0],[0,1]],edges:[[0,1],[1,2],[2,0]]};
assert.equal(M.initial({...triangle,start:1},0),null);
assert.equal(M.step({...triangle,oneWay:{0:[1,0]}},M.initial(triangle,0),0),null);
assert.equal(M.complete(triangle,M.initial(triangle,0)),false);
let g={...triangle,doubleEdges:[0]},s=M.initial(g,0);s=M.step(g,s,0);assert.equal(s.counts[0],1);s=M.step(g,s,0);assert.equal(s.counts[0],2);assert.equal(M.step(g,s,0),null);
g={...triangle,switchNodes:[1],dynamicEdges:{1:[1,2]}};s=M.initial(g,1);assert.equal(s.flip,0);s=M.initial(g,0);s=M.step(g,s,0);assert.equal(s.flip,1);assert.equal(M.step(g,s,1),null);assert.equal(M.initial(g,0).flip,0);
g={...triangle,onceNodes:[1],onceEdges:{1:[1,2]},doubleEdges:[0]};s=M.initial(g,0);s=M.step(g,s,0);assert.equal(s.once,1);s=M.step(g,s,0);s=M.step(g,s,2);s=M.step(g,s,1);assert.equal(s.once,1);assert.deepEqual(s.triggered,[1]);
g={...triangle,checkpoints:[1,2]};s=M.initial(g,0);assert.equal(M.step(g,s,2),null);s=M.step(g,s,0);assert.equal(s.checkpoint,1);s=M.step(g,s,1);assert.equal(s.checkpoint,2);
g={...triangle,keys:{1:'K'},locks:{2:'K'}};s=M.initial(g,0);assert.equal(M.step(g,s,2),null);s=M.step(g,s,0);assert.deepEqual(s.keys,['K']);s=M.step(g,s,1);assert(M.step(g,s,2));
g={...triangle,colorSwitches:[1],colorEdges:{1:'B',2:'R'}};s=M.initial(g,1);assert.equal(s.color,'R');assert.equal(M.step(g,s,1),null);s=M.initial(g,0);s=M.step(g,s,0);assert.equal(s.color,'B');assert(M.step(g,s,1));
g={...triangle,portals:[[1,2]]};s=M.step(g,M.initial(g,0),0);assert.equal(s.current,2);assert.deepEqual(s.visited,[0,1,2]);assert.equal(s.steps,1);
for(const g of levels){const plan=M.solve(g);assert(M.validate(g,plan));const bad={start:plan.start,edges:plan.edges.slice(0,-1)};assert(!M.validate(g,bad));const corrupt={...g,solution:{start:plan.start,edges:[999]}};assert(!M.validate(corrupt,corrupt.solution));}
console.log('PASS: negative rule cases, arrival-only switches, one-time switches, double-pass reversal, portals, ordered arrivals, locks, color gates, incomplete/corrupt hints.');
