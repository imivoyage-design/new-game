'use strict';
const layouts=[
 ['初见',[[240,80],[95,315],[385,315]], [0,1,2,0]],
 ['方寸',[[110,85],[370,85],[370,315],[110,315]],[0,1,2,3,0]],
 ['小屋',[[110,190],[240,70],[370,190],[370,320],[110,320]],[0,1,2,0,4,3,2]],
 ['菱光',[[240,55],[390,200],[240,345],[90,200],[240,200]],[0,1,2,3,0,4,2]],
 ['信笺',[[105,100],[375,100],[375,310],[105,310]],[0,1,2,3,0,2]],
 ['双峰',[[75,300],[185,100],[295,300],[405,100],[185,300]],[0,1,2,3,4,1]],
 ['风筝',[[240,55],[370,190],[240,335],[110,190],[240,190]],[0,1,2,3,0,4,1]],
 ['双叶',[[240,200],[100,80],[100,320],[380,80],[380,320]],[0,1,2,0,3,4,0]],
 ['桥间',[[75,100],[240,100],[405,100],[75,300],[240,300],[405,300]],[0,1,2,5,4,3,0,4,1]],
 ['山间',[[80,300],[80,130],[240,55],[400,130],[400,300],[240,200]],[0,1,2,3,4,0,5,1,3,5,4]],
 ['四叶',[[240,200],[110,70],[370,70],[370,330],[110,330],[240,50],[390,200],[240,350],[90,200]],[0,1,5,0,2,6,0,3,7,0,4,8,0]],
 ['回响',[[95,80],[385,80],[385,320],[95,320],[175,150],[305,150],[305,250],[175,250]],[0,1,2,3,0,4,5,6,7,4]],
 ['星芒',[[240,45],[390,150],[335,330],[145,330],[90,150]],[0,2,4,1,3,0,1,2,3,4,0]],
 ['折纸',[[90,90],[240,90],[390,90],[90,310],[240,310],[390,310],[240,200]],[0,1,2,5,4,3,0,6,2,4,6,1]],
 ['花窗',[[110,80],[370,80],[370,320],[110,320],[240,200],[240,80],[370,200],[240,320],[110,200]],[0,5,1,6,2,7,3,8,0,4,1]],
 ['六角',[[150,65],[330,65],[420,200],[330,335],[150,335],[60,200],[240,200]],[0,1,2,3,4,5,0,6,2,4,6,1,3,6,5]],
 ['连山',[[70,300],[155,110],[240,300],[325,110],[410,300],[240,55],[240,200]],[0,1,2,3,4,2,6,1,5,3,6]],
 ['织网',[[100,80],[240,80],[380,80],[100,200],[240,200],[380,200],[100,320],[240,320],[380,320]],[0,1,2,5,8,7,6,3,0,4,2]],
 ['环游',[[240,45],[390,125],[390,275],[240,355],[90,275],[90,125],[240,200]],[0,1,2,3,4,5,0,6,1,5,6,2,4,6,3]],
 ['相连',[[100,80],[240,80],[380,80],[100,200],[240,200],[380,200],[100,320],[240,320],[380,320]],[0,1,2,5,8,7,6,3,0,4,1,5,4,7,3]]
];
function graph([name,points,trail]){const edges=[],seen=new Set();for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],p=points[a],q=points[b],dx=q[0]-p[0],dy=q[1]-p[1],len=dx*dx+dy*dy;const chain=points.map((r,n)=>({n,t:((r[0]-p[0])*dx+(r[1]-p[1])*dy)/len,cross:Math.abs((r[0]-p[0])*dy-(r[1]-p[1])*dx)})).filter(r=>r.t>=0&&r.t<=1&&r.cross<.01).sort((a,b)=>a.t-b.t);for(let j=1;j<chain.length;j++){const x=chain[j-1].n,y=chain[j].n,key=[x,y].sort((a,b)=>a-b).join('-');if(!seen.has(key)){seen.add(key);edges.push([x,y]);}}}return{name,points,edges};}
const levels=layouts.map(graph);
function solve(g,start){const adjacency=g.points.map(()=>[]);g.edges.forEach(([a,b],i)=>{adjacency[a].push([b,i]);adjacency[b].push([a,i]);});const odd=adjacency.map((a,i)=>a.length%2?i:-1).filter(i=>i>=0);if(odd.length!==0&&odd.length!==2)return null;if(start!==undefined&&odd.length===2&&!odd.includes(start))return null;const s=start??odd[0]??0,stack=[s],used=new Set(),route=[];while(stack.length){const v=stack.at(-1),edge=adjacency[v].find(e=>!used.has(e[1]));if(edge){used.add(edge[1]);stack.push(edge[0]);}else route.push(stack.pop());}return used.size===g.edges.length?route.reverse():null;}
if(typeof module!=='undefined')module.exports={levels,solve};
if (typeof document !== 'undefined') {
  const $ = s => document.querySelector(s);
  const svg = $('#board'), NS = 'http://www.w3.org/2000/svg';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('one-line-v1') || '{}') || {}; } catch {}
  const completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(n => Number.isInteger(n) && n >= 0 && n < 20));
  let unlocked = Math.min(19, Math.max(0, ...Array.from(completed, n => n + 1)));
  let index = unlocked, sound = saved.sound === true, haptics = saved.haptics !== false;
  let used = new Set(), route = [], history = [], current = -1, pointer = null, inputType = null;
  let won = false, hintTimer = null, hintEdge = -1, hintNode = -1, last = null, audio;
  let edgesDOM = [], nodesDOM = [], liveStroke, halo, cursorCore;
  let preview = null, selectedEdge = null, offTrack = false, frame = null, lastBuzz = 0;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const supportsHaptics = typeof navigator.vibrate === 'function';

  function save() {
    try { localStorage.setItem('one-line-v1', JSON.stringify({ completed: [...completed], sound, haptics })); } catch {}
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
    edgesDOM = g.edges.map(([a, b]) => {
      const line = element('line', { x1: g.points[a][0], y1: g.points[a][1], x2: g.points[b][0], y2: g.points[b][1], class: 'edge' });
      svg.append(line); return line;
    });
    liveStroke = element('line', { class: 'live-stroke', visibility: 'hidden' });
    svg.append(liveStroke);
    nodesDOM = g.points.map(([x, y]) => {
      const node = element('circle', { cx: x, cy: y, r: 9, class: 'node' });
      svg.append(node); return node;
    });
    halo = element('circle', { r: 23, class: 'cursor-halo', visibility: 'hidden' });
    cursorCore = element('circle', { r: 4, class: 'cursor-core', visibility: 'hidden' });
    svg.append(halo, cursorCore);
  }
  function render() {
    const visited = new Set(route), g = levels[index];
    edgesDOM.forEach((line, i) => line.setAttribute('class', 'edge' + (used.has(i) ? ' done' : hintEdge === i ? ' hint' : '')));
    nodesDOM.forEach((node, i) => {
      node.setAttribute('class', 'node' + (i === current || i === hintNode ? ' current' : visited.has(i) ? ' visited' : ''));
      node.setAttribute('r', i === current || i === hintNode ? 11 : 9);
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
    $('#count').textContent = used.size; $('#total').textContent = g.edges.length;
    $('#bar').style.width = used.size / g.edges.length * 100 + '%';
    $('#undo').disabled = history.length === 0 || pointer === null || won;
  }
  function scheduleRender() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => { frame = null; render(); });
  }
  function stopHint() {
    clearInterval(hintTimer); hintTimer = null; hintEdge = -1; hintNode = -1; $('#hint').disabled = false;
  }
  function reset(message = '按住圆点出发 · 原路回拖可撤回') {
    stopHint(); pointer = null; used.clear(); route = []; history = []; current = -1; last = null;
    selectedEdge = null; preview = null; offTrack = false; won = false;
    $('#hint').disabled = false; $('#win').hidden = true; status(message); render();
  }
  function load(n) {
    index = n; buildBoard(); reset();
    $('#levelNo').textContent = String(n + 1).padStart(2, '0');
    $('#levelName').textContent = n === 0 ? '从三角形开始' : levels[n].name;
    $('#difficulty').textContent = n < 6 ? '初见 · 入门' : n < 13 ? '渐入 · 进阶' : '心流 · 挑战';
    $('#start').innerHTML = '▶ ' + (completed.size ? '继续挑战' : '开始游戏') + ' <span>PRESS START</span>';
  }
  function summary() {
    unlocked = Math.min(19, Math.max(0, ...Array.from(completed, n => n + 1)));
    $('#completed').textContent = String(completed.size).padStart(2, '0');
    $('#miniProgress').innerHTML = levels.map((_, i) => `<span class="${completed.has(i) ? 'done' : ''}"></span>`).join('');
  }
  function win() {
    won = true; pointer = null; preview = null; selectedEdge = null;
    completed.add(index); save(); summary(); render();
    $('#hint').disabled = false; $('#win').hidden = false;
    $('#winTitle').textContent = index === 19 ? '全关制霸！' : '漂亮，一笔通关！';
    $('#winText').textContent = index === 19 ? '20 关全部走过。回到关卡列表，再玩一局吧。' : 'STAGE CLEAR · 所有线段连接完成';
    $('#next').textContent = index === 19 ? '选择关卡 ▦' : '下一关 ▶';
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
      const undo = history.at(-1) === i;
      return !used.has(i) || undo ? [{ i, next: a === current ? b : a, undo }] : [];
    });
  }
  function undoStep() {
    if (won || pointer === null || history.length === 0) return false;
    used.delete(history.pop()); route.pop(); current = route.at(-1);
    selectedEdge = null; offTrack = true; preview = { point: levels[index].points[current], undo: false };
    status('已撤回一笔 · 保持按住，换条路试试'); vibrate('undo'); tone(false, true); render();
    return true;
  }
  function sample(q) {
    const g = levels[index], start = g.points[current], tolerance = radius(inputType === 'touch' ? 25 : 21, 44);
    if (offTrack) {
      if (distance(q, preview?.point || start) > tolerance && distance(q, start) > tolerance) return;
      offTrack = false;
    }
    if (distance(q, start) < radius(11, 23)) selectedEdge = null;
    const candidates = choices().map(c => ({ ...c, ...project(q, start, g.points[c.next]) }));
    let c = selectedEdge === null ? null : candidates.find(c => c.i === selectedEdge);
    if (!c) c = candidates.sort((a, b) => a.distance - b.distance)[0];
    if (!c || c.distance > tolerance) {
      if (distance(q, start) < tolerance) return;
      offTrack = true; status('轻轻沿线走 · 回到描线处即可继续'); return;
    }
    if (c.t > .13) selectedEdge = c.i;
    preview = { point: c.point, undo: c.undo };
    if (c.t > .55 && distance(q, g.points[c.next]) < radius(inputType === 'touch' ? 18 : 13, 32)) {
      if (c.undo) { undoStep(); }
      else {
        used.add(c.i); history.push(c.i); route.push(c.next); current = c.next;
        selectedEdge = null; preview = { point: g.points[current], undo: false };
        tone(); vibrate();
        if (used.size === g.edges.length) { win(); return; }
        const dead = !g.edges.some(([a, b], i) => !used.has(i) && (a === current || b === current));
        status(dead ? '前方没路啦 · 保持按住，原路回拖撤回' : '保持按住继续 · 走错可原路回拖');
      }
    }
  }
  svg.addEventListener('pointerdown', e => {
    if (pointer !== null || won || hintTimer || e.button !== 0) return;
    inputType = e.pointerType;
    const p = point(e), node = near(p);
    if (node < 0) { status('先按住一个圆点，再沿线移动'); return; }
    e.preventDefault(); reset(); pointer = e.pointerId; current = node; route = [node]; last = p;
    preview = { point: levels[index].points[node], undo: false };
    svg.setPointerCapture(e.pointerId); $('#hint').disabled = true;
    status('保持按住 · 原路回拖可撤回'); vibrate('start'); render();
  });
  svg.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer || won) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const event of events.length ? events : [e]) {
      if (pointer === null) break;
      const p = point(event), origin = last, steps = Math.max(1, Math.ceil(distance(origin, p) / 6));
      for (let s = 1; s <= steps; s++) {
        sample([origin[0] + (p[0] - origin[0]) * s / steps, origin[1] + (p[1] - origin[1]) * s / steps]);
        if (pointer === null) break;
      }
      last = p;
    }
    scheduleRender();
  });
  function release(e) {
    if (pointer !== null && (!e || e.pointerId === pointer)) reset('已松手，路线重置 · 按住圆点再来一局');
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { release(); if (hintTimer) { stopHint(); render(); status('提示已暂停，可重新查看'); } }
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
    if (!path) { status('暂无提示'); return; }
    let step = 0; hintNode = path[0]; $('#hint').disabled = true;
    status('记住这条路线 · 演示后自己试试'); render();
    hintTimer = setInterval(() => {
      if (step >= path.length - 1) { stopHint(); render(); status('提示结束 · 按住刚才的起点试试吧'); return; }
      const a = path[step], b = path[++step]; hintNode = b;
      hintEdge = g.edges.findIndex(([x, y]) => x === a && y === b || x === b && y === a); render();
    }, 550);
  };
  function showLevels() {
    if (pointer !== null) return;
    stopHint(); render();
    $('#levelGrid').innerHTML = levels.map((_, n) => `<button ${n > unlocked ? 'disabled' : ''} class="${n === index ? 'selected' : ''}" data-level="${n}" aria-label="第${n + 1}关${n > unlocked ? '，未解锁' : ''}">${n > unlocked ? '▦' : String(n + 1).padStart(2, '0')}<small>${completed.has(n) ? '已完成' : n > unlocked ? '未解锁' : '可挑战'}</small></button>`).join('');
    $('#levelDialog').showModal();
  }
  $('#levelGrid').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) { load(Number(b.dataset.level)); $('#levelDialog').close(); } };
  $('#levelsBtn').onclick = showLevels;
  $('#closeDialog').onclick = () => $('#levelDialog').close();
  $('#levelDialog').onclick = e => {
    if (e.target === $('#levelDialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); }
  };
  $('#next').onclick = () => index === 19 ? showLevels() : load(index + 1);
  $('#replay').onclick = () => load(index);
  $('#start').onclick = () => {
    if (won) load(unlocked);
    $('.console').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    status('按住圆点出发 · 原路回拖可撤回');
  };
  $('.brand').onclick = e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  function settingsLabels() {
    $('#sound').textContent = '声音：' + (sound ? '开' : '关');
    $('#sound').setAttribute('aria-label', sound ? '关闭声音' : '打开声音');
    $('#sound').setAttribute('aria-pressed', String(sound));
    $('#haptics').textContent = supportsHaptics ? '振动：' + (haptics ? '开' : '关') : '振动：不支持';
    $('#haptics').disabled = !supportsHaptics;
    $('#haptics').setAttribute('aria-label', supportsHaptics ? haptics ? '关闭振动' : '打开振动' : '此浏览器不支持振动');
    $('#haptics').setAttribute('aria-pressed', String(haptics && supportsHaptics));
    $('#hapticNote').textContent = supportsHaptics ? 'SOUND / HAPTICS' : '当前浏览器不支持触感振动';
  }
  $('#sound').onclick = () => { sound = !sound; save(); settingsLabels(); tone(); };
  $('#haptics').onclick = () => { haptics = !haptics; save(); settingsLabels(); inputType = null; if (haptics) vibrate('start'); };
  settingsLabels(); summary(); load(index);
}
