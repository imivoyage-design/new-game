'use strict';
const levels = typeof DEMO_LEVELS !== 'undefined' ? DEMO_LEVELS : require('./levels.js');
const mechanics = typeof LineMechanics !== 'undefined' ? LineMechanics : require('./mechanics.js');
const chapters=['草原星球','奶油雲海','糖果森林','月光湖畔','冰晶王國','星砂沙漠','夢境銀河','願望之星'];
function canTraverse(g, edge, from, to, state) {
  const pair=g.edges[edge];
  return !!pair&&pair.includes(from)&&pair.includes(to)&&!mechanics.reason(g,state||mechanics.initial(g,from),edge);
}
function solve(g,start){return mechanics.solve(g,start);}
if(typeof module!=='undefined')module.exports={levels,solve,canTraverse};
if (typeof document !== 'undefined') {
  const $ = s => document.querySelector(s);
  const svg = $('#board'), NS = 'http://www.w3.org/2000/svg';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('kirby-line-demo-v1') || localStorage.getItem('one-line-v1') || '{}') || {}; } catch {}
  if (saved.puzzleSet !== 'dream-v3' && Array.isArray(saved.completed)) {
    try { localStorage.setItem('kirby-line-archive-v1', JSON.stringify(saved)); } catch {}
  }
  const completed = new Set((Array.isArray(saved.completed) ? saved.completed.map(v=>typeof v==='string'?levels.findIndex(g=>g.id===v):v) : []).filter(n => Number.isInteger(n) && n >= 0 && n < levels.length));
  let unlocked = Math.min(levels.length - 1, Math.max(0, ...Array.from(completed, n => n + 1)));
  let index = unlocked, sound = saved.sound === true, haptics = saved.haptics !== false;
  let state=null, snapshots=[], hintState=null, portalPending=false, specialLabels=[], bridgeMarks=[];
  let used = new Set(), counts = [], route = [], history = [], current = -1, pointer = null, inputType = null;
  let won = false, hintTimer = null, hintEdge = -1, hintNode = -1, last = null, audio;
  let doubleLabels = [], hintRoute = [], arrowsDOM = [], edgesDOM = [], nodesDOM = [], liveStroke, halo, cursorCore;
  let preview = null, selectedEdge = null, offTrack = false, rejoinAtNode = false, frame = null, lastBuzz = 0;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const supportsHaptics = typeof navigator.vibrate === 'function';

  function save() {
    try { localStorage.setItem('kirby-line-demo-v1', JSON.stringify({ puzzleSet: 'dream-v3', completed: [...completed].map(i=>levels[i].id), sound, haptics })); } catch {}
  }
  function vibrate(kind = 'node') {
    if (!haptics || !supportsHaptics || inputType === 'mouse') return;
    const now = performance.now();
    if (kind === 'node' && now - lastBuzz < 40) return;
    lastBuzz = now;
    try { navigator.vibrate(kind === 'win' ? [18, 50, 25, 50, 35] : kind === 'undo' ? [9, 28, 9] : kind === 'start' ? 8 : 12); } catch {}
  }
  function tone(win = false, undo = false) {
    if (!sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(win ? 660 : undo ? 290 : 480, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(win ? 990 : undo ? 180 : 580, audio.currentTime + .09);
      g.gain.setValueAtTime(.025, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .14);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + .15);
    } catch {}
  }
  function status(t) { $('#status').textContent = t; }
  function element(name, attrs) {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }
  function buildBoard() {
    svg.replaceChildren();
    const g = levels[index];
    counts=g.edges.map(()=>0);
    edgesDOM = g.edges.map(([a, b]) => {
      const line = element('line', { x1: g.points[a][0], y1: g.points[a][1], x2: g.points[b][0], y2: g.points[b][1], class: 'edge' });
      svg.append(line); return line;
    });
    arrowsDOM = g.edges.map((_,i) => {
      const direction=g.dynamicEdges?.[i] || g.onceEdges?.[i] || g.oneWay?.[i];if(!direction)return null;
      const a=g.points[direction[0]],b=g.points[direction[1]],angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
      const arrow=element('path',{d:'M -9 -7 L 3 0 L -9 7',class:'one-way-arrow',transform:`translate(${(a[0]+b[0])/2} ${(a[1]+b[1])/2}) rotate(${angle})`,'aria-label':'單向線段'});
      svg.append(arrow);return arrow;
    });
    doubleLabels=[];g.edges.forEach(([a,b],i)=>{if(mechanics.quota(g,i)===2){const p=g.points[a],q=g.points[b];const label=element('text',{x:(p[0]+q[0])/2,y:(p[1]+q[1])/2-13,class:'double-label'});label.textContent='×2';doubleLabels[i]=label;svg.append(label);}});
    liveStroke = element('line', { class: 'live-stroke', visibility: 'hidden' });
    svg.append(liveStroke);
    arrowsDOM.forEach(arrow=>{if(arrow)svg.append(arrow);});
    nodesDOM = g.points.map(([x, y]) => {
      const node = element('circle', { cx: x, cy: y, r: 9, class: 'node' });
      svg.append(node); return node;
    });
    specialLabels = g.points.map(([x,y],i)=>{
      let label=g.start===i?'S':g.checkpoints?.includes(i)?'ABC'[g.checkpoints.indexOf(i)]:g.keys?.[i]?'K':g.portals?.some(p=>p.includes(i))?'P':g.onceNodes?.includes(i)?'①':g.switchNodes?.includes(i)?'↻':g.colorSwitches?.includes(i)?'◐':'';
      if(!label)return null;
      const t=element('text',{x,y:y+1,class:'node-label','aria-label':label});t.textContent=label;svg.append(t);return t;
    });
    g.edges.forEach(([a,b],i)=>{if(!g.locks?.[i]&&!g.colorEdges?.[i])return;const p=g.points[a],q=g.points[b];const t=element('text',{x:(p[0]+q[0])/2,y:(p[1]+q[1])/2-13,class:'channel-label'});t.textContent=g.locks?.[i]?'K ▣':g.colorEdges[i]==='R'?'R':'B';svg.append(t);});
    bridgeMarks=[];
    if(g.bridge)g.edges.forEach(([a,b],i)=>g.edges.slice(0,i).forEach(([c,d])=>{
      if([a,b].includes(c)||[a,b].includes(d))return;
      const p=g.points[a],q=g.points[b],r=g.points[c],t=g.points[d],dx=q[0]-p[0],dy=q[1]-p[1],ex=t[0]-r[0],ey=t[1]-r[1],den=dx*ey-dy*ex;if(Math.abs(den)<.01)return;
      const u=((r[0]-p[0])*ey-(r[1]-p[1])*ex)/den,v=((r[0]-p[0])*dy-(r[1]-p[1])*dx)/den;if(u<.06||u>.94||v<.06||v>.94)return;
      const transform=`translate(${p[0]+u*dx} ${p[1]+u*dy}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`,path='M -12 0 Q 0 -18 12 0';
      const mask=element('path',{d:path,transform,class:'bridge-mask'}),arc=element('path',{d:path,transform,class:'bridge-arc'});svg.append(mask,arc);bridgeMarks.push({i,arc});
    }));
    halo = element('circle', { r: 23, class: 'cursor-halo', visibility: 'hidden' });
    cursorCore = element('circle', { r: 4, class: 'cursor-core', visibility: 'hidden' });
    svg.append(halo, cursorCore);
  }
  function render() {
    const g=levels[index],display=hintState||state||mechanics.initial(g,g.start??g.solution.start),visited=new Set((hintState||state)?.visited||[]),shown=hintState?hintState.counts:counts;
    doubleLabels.forEach((label,i)=>{if(label)label.textContent=shown[i]?shown[i]+'/2':'×2';});
    function edgeClass(i){return 'edge'+(mechanics.quota(g,i)===2?' double-edge':'')+(g.dynamicEdges?.[i]?' dynamic-edge':'')+(g.onceEdges?.[i]?' once-edge':'')+(g.colorEdges?.[i]==='R'?' red-channel':g.colorEdges?.[i]==='B'?' blue-channel':'')+(g.locks?.[i]&&!display.keys.includes(g.locks[i])?' locked-edge':'')+(g.colorEdges?.[i]&&g.colorEdges[i]!==display.color?' closed-channel':'')+(shown[i]>=mechanics.quota(g,i)?' done':shown[i]?' half':'')+(hintEdge===i?' hint':'');}
    edgesDOM.forEach((line,i)=>line.setAttribute('class',edgeClass(i)));
    bridgeMarks.forEach(({i,arc})=>arc.setAttribute('class',edgeClass(i)+' bridge-arc'));
    arrowsDOM.forEach((arrow,i)=>{if(!arrow)return;const d=mechanics.direction(g,i,display),from=g.points[d[0]],to=g.points[d[1]];arrow.setAttribute('transform',`translate(${(from[0]+to[0])/2} ${(from[1]+to[1])/2}) rotate(${Math.atan2(to[1]-from[1],to[0]-from[0])*180/Math.PI})`);arrow.setAttribute('class','one-way-arrow'+(g.dynamicEdges?.[i]?' dynamic-arrow':'')+(g.onceEdges?.[i]?' once-arrow':'')+(shown[i]>=mechanics.quota(g,i)?' done':''));});
    nodesDOM.forEach((node,i)=>{
      node.setAttribute('class','node'+(g.switchNodes?.includes(i)?' switch-node':'')+(g.start===i?' start-node':'')+(g.portals?.some(p=>p.includes(i))?' portal-node':'')+(g.onceNodes?.includes(i)?' once-node':'')+(g.colorSwitches?.includes(i)?' color-node color-'+display.color:'')+(g.checkpoints?.includes(i)?' checkpoint-node':'')+(g.keys?.[i]?' key-node':'')+(i===current||i===hintNode?' current':visited.has(i)?' visited':''));
      node.setAttribute('r',specialLabels[i]?13:i===current||i===hintNode?11:9);
    });
    const active = pointer !== null && preview !== null && !won;
    liveStroke.setAttribute('visibility', active ? 'visible' : 'hidden');
    halo.setAttribute('visibility', active ? 'visible' : 'hidden');
    cursorCore.setAttribute('visibility', active ? 'visible' : 'hidden');
    if (active) {
      const start = g.points[current];
      liveStroke.setAttribute('x1', start[0]); liveStroke.setAttribute('y1', start[1]);
      liveStroke.setAttribute('x2', preview.point[0]); liveStroke.setAttribute('y2', preview.point[1]);
      liveStroke.setAttribute('class', 'live-stroke' + (preview.undo ? ' rewind' : ''));
      for (const cursor of [halo, cursorCore]) { cursor.setAttribute('cx', preview.point[0]); cursor.setAttribute('cy', preview.point[1]); }
    }
    const total=g.edges.reduce((n,_,i)=>n+mechanics.quota(g,i),0),done=shown.reduce((a,b)=>a+b,0);
    $('#count').textContent = done; $('#total').textContent = total;
    $('#bar').style.width = done / total * 100 + '%';
    $('#undo').disabled = history.length === 0 || pointer === null || won;
  }
  function scheduleRender() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => { frame = null; render(); });
  }
  function stopHint() {
    clearInterval(hintTimer); hintTimer = null; hintState=null; hintRoute=[]; hintEdge = -1; hintNode = -1; $('#hint').disabled = false;
  }
  function reset(message) {
    stopHint(); state=null; snapshots=[];portalPending=false; pointer = null; used.clear(); counts=levels[index].edges.map(()=>0); route = []; history = []; current = -1; last = null;
    selectedEdge = null; preview = null; offTrack = false; rejoinAtNode = false; won = false;
    $('#hint').disabled = false; $('#win').hidden = true; status(message || levels[index].ruleText || (Object.keys(levels[index].oneWay || {}).length ? '箭頭線只能順向走 · 回拖仍可撤回' : '按住圓點 · 一筆連完所有線段')); render();
  }
  function load(n) {
    index = n; buildBoard(); reset();
    $('#levelNo').textContent = String(n + 1).padStart(2, '0');
    $('#levelName').textContent = levels[n].name;
    $('#chapterLabel').textContent = 'CHAPTER ' + String(Math.floor(n / 25) + 1).padStart(2, '0') + ' / ' + chapters[Math.floor(n / 25)];
    $('#difficulty').textContent = levels[n].difficultyLabel;
    $('#start').innerHTML = '▶ ' + (completed.size ? '繼續冒險' : '開始冒險') + ' <span>PRESS START</span>';
  }
  function summary() {
    unlocked = Math.min(levels.length - 1, Math.max(0, ...Array.from(completed, n => n + 1)));
    $('#completed').textContent = String(completed.size).padStart(2, '0');
    $('#miniProgress').innerHTML = chapters.map((_, c) => `<span title="第 ${c+1} 章" class="${Array.from({length:25},(_,j)=>c*25+j).every(i=>completed.has(i)) ? 'done' : ''}"></span>`).join('');
  }
  function win() {
    won = true; pointer = null; preview = null; selectedEdge = null;
    completed.add(index); save(); summary(); render();
    $('#hint').disabled = false; $('#win').hidden = false;
    $('#winTitle').textContent = completed.size === levels.length ? '全關制霸！' : '漂亮，一筆通關！';
    $('#winText').textContent = completed.size === levels.length ? '200 關的星光，都被你收集到了！' : (index + 1) % 25 === 0 ? '章節完成 · 下一顆星球等著你！' : 'STAGE CLEAR · 收集到一顆小星星';
    $('#next').textContent = index === levels.length - 1 ? '選擇關卡 ▦' : '下一關 ▶';
    status('STAGE CLEAR!'); vibrate('win'); tone(true);
  }
  function point(e) {
    const r = svg.getBoundingClientRect();
    return [(e.clientX - r.left) * 480 / r.width, (e.clientY - r.top) * 400 / r.height];
  }
  // Keep the physical touch target comfortable even on a small LCD.
  function radius(px, max = 40) { return Math.min(max, px * 480 / svg.getBoundingClientRect().width); }
  function near(p) {
    let best = -1, d = radius(inputType === 'touch' ? 20 : 15, 37);
    levels[index].points.forEach((q, i) => { const v = distance(p, q); if (v < d) { d = v; best = i; } });
    return best;
  }
  function project(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    const q = [a[0] + dx * t, a[1] + dy * t];
    return { point: q, t, distance: distance(p, q) };
  }
  function choices() {
    return levels[index].edges.flatMap(([a, b], i) => {
      if (a !== current && b !== current) return [];
      const undo = history.at(-1) === i && snapshots.at(-2)?.current === (a===current?b:a) && !(mechanics.quota(levels[index],i)===2 && counts[i]<2);
      const next = a === current ? b : a;
      return undo || counts[i]<mechanics.quota(levels[index],i) && canTraverse(levels[index],i,current,next,state) ? [{ i, next, undo }] : [];
    });
  }
  function undoStep(fromDrag = false) {
    if (won || pointer === null || history.length === 0) return false;
    history.pop();snapshots.pop();state=snapshots.at(-1);counts=state.counts.slice();used=new Set(counts.flatMap((n,i)=>n===mechanics.quota(levels[index],i)?[i]:[]));route.pop();current=state.current;portalPending=false;
    selectedEdge = null; offTrack = false; rejoinAtNode = !fromDrag; preview = { point: levels[index].points[current], undo: false };
    status('已撤回一筆 · 保持按住，換條路試試'); vibrate('undo'); tone(false, true); render();
    return true;
  }
  function sample(q) {
    if(portalPending)return;
    // Measure the invisible hit corridor in CSS pixels, including on small phones.
    // The old SVG-unit cap made a narrow phone less forgiving than a desktop.
    const g = levels[index], start = g.points[current], tolerance = radius(inputType === 'touch' ? 31 : 25, 72);
    if (rejoinAtNode) {
      // B cancels a step while the finger may still be at its old endpoint.
      // Do not immediately draw that step again before returning to the node.
      if (distance(q, start) > tolerance) return;
      rejoinAtNode = false;
    }
    const blocked = g.edges.flatMap(([a,b],i)=>{
      if(counts[i]>=mechanics.quota(g,i)||history.at(-1)===i||a!==current&&b!==current)return [];
      const next=a===current?b:a;
      return canTraverse(g,i,current,next,state)?[]:[{...project(q,start,g.points[next]),next}];
    }).find(c=>c.t>.25&&c.distance<radius(10,18));
    if(blocked){offTrack=false;selectedEdge=null;preview={point:start,undo:false};status(mechanics.reason(g,state,g.edges.findIndex(([a,b])=>a===current&&b===blocked.next||b===current&&a===blocked.next)));return;}
    const available = choices();
    // A finger can round a junction without hitting its exact centre. Keep the
    // whole arrival/turn area unlocked, including the tail of an undone edge.
    const shortest = Math.min(...available.map(c => distance(start, g.points[c.next])));
    const junctionRadius = Math.min(shortest * .45, radius(27, 44));
    const inJunction = distance(q, start) <= junctionRadius;
    if (inJunction) selectedEdge = null;
    const candidates = available.map(c => ({ ...c, ...project(q, start, g.points[c.next]) }));
    let c = selectedEdge === null ? null : candidates.find(c => c.i === selectedEdge);
    if (!c) c = candidates.sort((a, b) => a.distance - b.distance)[0];
    if (!c || c.distance > tolerance) {
      if (distance(q, start) < tolerance) return;
      offTrack = true; status('路線已保留 · 移回這條線即可繼續'); return;
    }
    // Rejoin anywhere on the active edge, not only beside the last accepted
    // pointer position. Keep its branch lock so nearby crossings cannot steal it.
    if (offTrack) status('已接回路線 · 保持按住繼續');
    offTrack = false;
    if (!inJunction && c.t > .2) selectedEdge = c.i;
    preview = { point: c.point, undo: c.undo };
    const arrivalRadius = c.undo
      ? Math.min(distance(start, g.points[c.next]) * .4, radius(25, 38))
      : Math.min(distance(start, g.points[c.next]) * .42, radius(inputType === 'touch' ? 22 : 15, 52));
    if (c.t > .55 && distance(q, g.points[c.next]) < arrivalRadius) {
      if (c.undo) { undoStep(true); }
      else {
        state=mechanics.step(g,state,c.i);if(!state)return;counts=state.counts.slice();if(counts[c.i]===mechanics.quota(g,c.i))used.add(c.i);history.push(c.i);snapshots.push(state);route.push(c.next);current=state.current;portalPending=current!==c.next;
        selectedEdge = null; preview = { point: g.points[current], undo: false };
        tone(); vibrate();
        if (mechanics.complete(g,state)) { win(); return; }
        const dead = !g.edges.some(([a,b],i)=>counts[i]<mechanics.quota(g,i)&&(a===current||b===current)&&canTraverse(g,i,current,a===current?b:a,state)); 
        status(portalPending?'已傳送 · 保持按住移到另一個 P，B 可撤回':dead?'前方沒路啦 · 原路回拖或 B 撤回':'保持按住繼續 · 走錯可原路回拖');
      }
    }
  }
  svg.addEventListener('pointerdown', e => {
    if (pointer !== null || won || hintTimer || e.button !== 0) return;
    inputType = e.pointerType;
    const p = point(e), node = near(p);
    if (node < 0) { status('先按住一個圓點，再沿線移動'); return; }
    const initial=mechanics.initial(levels[index],node);if(!initial){status(levels[index].start!==undefined?'請從標示 S 的 START 出發':'請依檢查點 A → B → C 出發');return;}
    e.preventDefault();reset();state=initial;snapshots=[state];counts=state.counts.slice();pointer=e.pointerId;current=node;route=[node];last=p;
    preview = { point: levels[index].points[node], undo: false };
    svg.setPointerCapture(e.pointerId); $('#hint').disabled = true;
    status(levels[index].ruleText || '保持按住 · 原路回拖可撤回'); vibrate('start'); render();
  });
  svg.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer || won) return;
    e.preventDefault();
    if(portalPending){const p=point(e);if(distance(p,levels[index].points[current])<radius(25,40)){portalPending=false;last=p;preview={point:levels[index].points[current],undo:false};status('已抵達出口 · 沿線繼續');scheduleRender();}return;}
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const event of events.length ? events : [e]) {
      if (pointer === null) break;
      const p = point(event), origin = last, steps = Math.max(1, Math.ceil(distance(origin, p) / 6));
      for (let s = 1; s <= steps; s++) {
        sample([origin[0] + (p[0] - origin[0]) * s / steps, origin[1] + (p[1] - origin[1]) * s / steps]);
        if (pointer === null||portalPending) break;
      }
      last = p;
    }
    scheduleRender();
  });
  function release(e) {
    if (pointer !== null && (!e || e.pointerId === pointer)) reset('已鬆手，路線重置 · 按住圓點再試一次');
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { release(); if (hintTimer) { stopHint(); render(); status('提示已暫停，可重新查看'); } }
  });
  // A second finger may use B while the drawing finger keeps its capture.
  $('#undo').addEventListener('pointerdown', e => {
    if (e.pointerId === pointer) return;
    e.preventDefault(); undoStep(); $('#undo').classList.add('pressed');
  });
  window.addEventListener('pointerup', () => $('#undo').classList.remove('pressed'));
  $('#undo').addEventListener('click', e => { if (e.detail === 0) undoStep(); });
  window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (pointer !== null && (e.key.toLowerCase() === 'z' || e.key === 'Backspace')) { e.preventDefault(); undoStep(); }
  });
  $('#hint').onclick = () => {
    if (pointer !== null || won || hintTimer) return;
    reset(); const g = levels[index], path = solve(g);
    if (!path) { status('暫無提示'); return; }
    let tick=0;hintState=mechanics.initial(g,path.start);hintNode=path.start;$('#hint').disabled=true;
    status('跟著星光看路線 · 機關狀態同步演示');render();
    hintTimer=setInterval(()=>{
      if(tick>=path.edges.length){stopHint();render();status('提示結束 · 按住剛才的起點試試吧');return;}
      hintEdge=path.edges[tick++];hintState=mechanics.step(g,hintState,hintEdge);hintNode=hintState.current;render();
    },650);
  };

  let selectedChapter = 0;
  function renderChapter() {
    $('#chapterTabs').innerHTML = chapters.map((name,c)=>`<button class="${selectedChapter===c?'selected':''}" data-chapter="${c}">${String(c+1).padStart(2,'0')} ${name}</button>`).join('');
    const first=selectedChapter*25;
    const done=levels.slice(first,first+25).filter((_,i)=>completed.has(first+i)).length;
    $('#chapterDescription').textContent = `${chapters[selectedChapter]} · ${CHAPTER_MECHANICS[selectedChapter]} · ${done} / 25 顆星光`;
    $('#levelGrid').innerHTML = levels.slice(first,first+25).map((_,j)=>{const n=first+j;return `<button ${n>unlocked?'disabled':''} class="${n===index?'selected':''}" data-level="${n}" aria-label="第 ${n+1} 關${n>unlocked?' 未解鎖':''}">${n>unlocked?'✧':String(n+1).padStart(2,'0')}<small>${completed.has(n)?'★ 已完成':n>unlocked?'未解鎖':levels[n].phase}</small></button>`}).join('');
  }
  function showLevels() {
    if (pointer !== null) return;
    stopHint(); render(); selectedChapter=Math.floor(index/25);renderChapter();
    $('#levelDialog').showModal();
  }
  $('#chapterTabs').onclick=e=>{const b=e.target.closest('button');if(b){selectedChapter=Number(b.dataset.chapter);renderChapter()}};
  $('#reset').onclick=()=>reset();
  $('#levelGrid').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) { load(Number(b.dataset.level)); $('#levelDialog').close(); } };
  $('#levelsBtn').onclick = showLevels;
  $('#closeDialog').onclick = () => $('#levelDialog').close();
  $('#levelDialog').onclick = e => {
    if (e.target === $('#levelDialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); }
  };
  $('#next').onclick = () => index === levels.length - 1 ? showLevels() : load(index + 1);
  $('#replay').onclick = () => load(index);
  $('#start').onclick = () => {
    if (won) load(unlocked);
    $('.console').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    status(levels[index].ruleText || '按住圓點 · 一筆連完所有線段');
  };
  $('.brand').onclick = e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  function settingsLabels() {
    $('#sound').textContent = '聲音：' + (sound ? '開' : '關');
    $('#sound').setAttribute('aria-label', sound ? '關閉聲音' : '開啟聲音');
    $('#sound').setAttribute('aria-pressed', String(sound));
    $('#haptics').textContent = supportsHaptics ? '振動：' + (haptics ? '開' : '關') : '振動：不支援';
    $('#haptics').disabled = !supportsHaptics;
    $('#haptics').setAttribute('aria-label', supportsHaptics ? haptics ? '關閉振動' : '開啟振動' : '此瀏覽器不支援振動');
    $('#haptics').setAttribute('aria-pressed', String(haptics && supportsHaptics));
    $('#hapticNote').textContent = supportsHaptics ? 'SOUND / HAPTICS' : '此瀏覽器不支援觸感振動';
  }
  $('#sound').onclick = () => { sound = !sound; save(); settingsLabels(); tone(); };
  $('#haptics').onclick = () => { haptics = !haptics; save(); settingsLabels(); inputType = null; if (haptics) vibrate('start'); };
  settingsLabels(); summary(); load(index);
  if(saved.puzzleSet!=='dream-v3'&&completed.size){status('題庫已更新 · 保留你的解鎖進度與設定');save();}
}

