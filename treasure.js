/*! © 2026 Sumi Kanji */
// ===== Hiyo truy tìm kho báu: chạy nhảy vượt màn, né/giẫm yêu quái mực, đập hộp lấy xu và tìm 10 chữ Kanji giấu trong hộp quẻ =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = window.sumiEsc || ((t) => String(t));
  const params = new URLSearchParams(location.search);
  const PATH = window.SumiPath;
  const levelId = LEVELS[params.get('level')] ? params.get('level') : (PATH && PATH.current()) || 'g1';
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const IDX = window.SUMI_INDEX || {};
  const MAPS = window.SUMI_TREASURE || [];
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1].split(/[;,]/)[0].trim() : '');
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const SAVE = 'sumiKanji.treasure3';
  const T = 32, ROWS = 15, VH = ROWS * T;
  const G = 0.55, JUMP = -12.6, MAXV = 3.6, ACC = 0.45, FRIC = 0.8;
  const LIVES = 3;
  const FORM_AT = [0, 1, 2, 2, 3, 4, 5, 6, 6, 7, 8]; // số chữ đã thu → dạng tiến hóa (10 chữ = Phượng hoàng)
  let data = {};

  // ---------- Chữ & câu hỏi ----------
  function pickChars(n) {
    const chars = levelChars(levelId).filter((c) => IDX[c] && data[c]);
    const l = loadLearned();
    let pool = chars.filter((c) => l[c]);
    if (pool.length < n) pool = pool.concat(shuffle(chars.filter((c) => !l[c] && (!PATH || PATH.charOpen(levelId, c)))));
    if (pool.length < n) pool = pool.concat(shuffle(chars.filter((c) => !pool.includes(c))));
    return shuffle(pool.slice(0, Math.max(n, 10))).slice(0, n);
  }
  function uniq4(right, pool) { const o = [right]; for (const x of shuffle(pool)) { if (o.length >= 4) break; if (x && !o.includes(x)) o.push(x); } return shuffle(o); }
  function makeQuiz(c) {
    const d = data[c] || {};
    const others = Object.keys(data).filter((x) => x !== c);
    const words = (d.w || []).filter((w) => w[0].includes(c) && w[1]);
    const types = [];
    if (words.length) types.push('read', 'word');
    types.push('mean');
    const t = rand(types);
    if (t === 'read') {
      const w = rand(words.slice(0, 4));
      const pool = []; others.forEach((x) => (data[x].w || []).forEach((v) => { if (v[1] && Math.abs(v[1].length - w[1].length) <= 1) pool.push(v[1]); }));
      return { c, ask: 'Từ <b class="tq-w">' + esc(w[0]) + '</b> đọc là gì?<small>' + esc(w[3] || '') + '</small>', right: w[1], opts: uniq4(w[1], pool), jp: true };
    }
    if (t === 'word') {
      const w = rand(words.slice(0, 4));
      const pool = []; others.forEach((x) => (data[x].w || []).forEach((v) => { if (v[3]) pool.push(v[3]); }));
      return { c, ask: 'Từ <b class="tq-w">' + esc(w[0]) + '</b> <span class="tq-r">(' + esc(w[1]) + ')</span> nghĩa là gì?', right: w[3], opts: uniq4(w[3], pool) };
    }
    const vi = viOf(c);
    return { c, ask: 'Chữ <b class="tq-w">' + c + '</b> (' + esc(hvOf(c)) + ') nghĩa là gì?', right: vi, opts: uniq4(vi, others.map(viOf)) };
  }

  // ---------- Hình Hiyo ----------
  const IMG = {};
  function img(form, mood) {
    const k = form + '|' + mood;
    if (IMG[k]) return IMG[k];
    const svg = HIYO.svg(form, mood, { cls: 'x' }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return (IMG[k] = im);
  }

  // ---------- Canvas ----------
  const cv = $('tr-canvas'), ctx = cv.getContext('2d');
  let scale = 1, VW = 640, dpr = 1;
  function resize() {
    const box = $('tr-stage').getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    scale = box.height / VH; VW = box.width / scale;
    cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
    cv.style.width = box.width + 'px'; cv.style.height = box.height + 'px';
  }
  window.addEventListener('resize', resize);

  // ---------- Thế giới ----------
  // # đất · X đá · B thùng gỗ · Q hộp quẻ giấu chữ · ? hộp xu (U = đã mở) · o xu · E yêu quái mực · F cờ lưu · C rương · P xuất phát
  let W = null;
  window.__sumiTreasure = () => W; // hỗ trợ kiểm thử tự động
  window.__sumiTreasureQ = () => lastRight;
  const SOLID = new Set(['#', 'X', 'B', 'Q', '?', 'U']);
  function loadWorld(i, chars) {
    const M = MAPS[i];
    const cols = Math.max(...M.map.map((r) => r.length));
    const grid = M.map.map((r) => r.padEnd(cols, ' ').split(''));
    const boxes = [], coins = [], enemies = [];
    let start = { x: 64, y: 360 }, flag = null, chest = null;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < cols; c++) {
      const ch = grid[r][c], x = c * T, y = r * T;
      if (ch === 'P') { start = { x: x + 4, y: y + 2 }; grid[r][c] = ' '; }
      else if (ch === 'Q') boxes.push({ r, c, key: r + ',' + c });
      else if (ch === 'o') { coins.push({ x: x + 16, y: y + 16, got: false }); grid[r][c] = ' '; }
      else if (ch === 'E') { enemies.push({ x: x + 3, y: y + 8, w: 26, h: 24, vx: -0.9, vy: 0, on: false, alive: true, dead: 0, ph: Math.random() * 6 }); grid[r][c] = ' '; }
      else if (ch === 'F') { flag = { x: x + 8, y: y - 64, h: 96 }; grid[r][c] = ' '; }
      else if (ch === 'C') { chest = { x: x - 4, y: y + 4, w: 40, h: 28 }; grid[r][c] = ' '; }
    }
    boxes.sort((a, b) => a.c - b.c);
    boxes.forEach((b, k) => { b.ch = chars[k]; });
    return { i, M, cols, grid, boxes, coins, enemies, chars, start, flag, chest, fx: [], pops: [], cam: 0, time: 0, running: false, paused: false, over: false };
  }
  function newPlayer() {
    return { x: W.start.x, y: W.start.y, w: 24, h: 30, vx: 0, vy: 0, on: false, face: 1, form: 0, got: [], opened: new Set(), lock: {},
      lives: LIVES, coins: 0, stomps: 0, immune: 0, quiz: null, check: null, coyote: 0, jbuf: 0, jumpHeld: false, mood: 'happy', moodT: 0, done: false, items: [], local: true };
  }
  let P = null; // người chơi

  // ---------- Va chạm ----------
  const tileAt = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= W.cols ? ' ' : W.grid[r][c]);
  const solidAt = (c, r) => SOLID.has(tileAt(c, r));
  function moveX(o) {
    o.x += o.vx; o.wall = false;
    const r0 = Math.floor(o.y / T), r1 = Math.floor((o.y + o.h - 1) / T);
    if (o.vx > 0) { const c = Math.floor((o.x + o.w) / T); for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { o.x = c * T - o.w; o.vx = 0; o.wall = true; break; } }
    else if (o.vx < 0) { const c = Math.floor(o.x / T); for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { o.x = (c + 1) * T; o.vx = 0; o.wall = true; break; } }
    if (o.x < 0) { o.x = 0; o.vx = 0; o.wall = true; }
    if (o.x > W.cols * T - o.w) { o.x = W.cols * T - o.w; o.wall = true; }
  }
  function moveY(o, bump) {
    o.y += o.vy; o.on = false;
    const c0 = Math.floor(o.x / T), c1 = Math.floor((o.x + o.w - 1) / T);
    if (o.vy > 0) { const r = Math.floor((o.y + o.h) / T); for (let c = c0; c <= c1; c++) if (solidAt(c, r)) { o.y = r * T - o.h; o.vy = 0; o.on = true; break; } }
    else if (o.vy < 0) {
      const r = Math.floor(o.y / T);
      const mid = Math.floor((o.x + o.w / 2) / T);
      for (const c of [mid, c0, c1]) if (solidAt(c, r)) { o.y = (r + 1) * T; o.vy = 0; if (bump) headBump(c, r); break; }
    }
  }
  const itemRect = (it) => ({ x: it.x - 30, y: it.y - 22, w: 60, h: 44 }); // vùng chạm rộng để dễ ăn chữ
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- Đập hộp ----------
  function headBump(c, r) {
    const t = tileAt(c, r);
    W.bump = { c, r, t: 0.15 };
    // giẫm yêu quái đang đứng trên hộp vừa bị đập
    W.enemies.forEach((e) => { if (e.alive && Math.abs(e.x + e.w / 2 - (c * T + 16)) < 24 && Math.abs(e.y + e.h - r * T) < 6) kill(e, 'bump'); });
    if (t === '?') {
      W.grid[r][c] = 'U';
      W.pops.push({ x: c * T + 16, y: r * T, t: 0 });
      addCoin(1);
      return;
    }
    if (t !== 'Q') return;
    const b = W.boxes.find((x) => x.r === r && x.c === c);
    if (!b) return;
    if (P.opened.has(b.key)) {
      toast(P.items.some((it) => it.key === b.key) ? '⬆ Chữ đang nằm trên hộp! Đứng <b>bên cạnh hộp</b> rồi nhảy lên để lấy.' : 'Hộp này bạn đã mở rồi. Tìm hộp khác nhé!');
      return;
    }
    if (P.lock[b.key] && P.lock[b.key] > W.time) { toast('Hộp còn khóa ' + Math.ceil(P.lock[b.key] - W.time) + ' giây vì trả lời sai.'); return; }
    if (P.quiz) return;
    P.quiz = { box: b };
    openQuiz(b);
  }
  function answer(ok) {
    const b = P.quiz.box;
    P.quiz = null;
    if (ok) {
      P.opened.add(b.key);
      P.items.push({ ch: b.ch, key: b.key, x: b.c * T + T / 2, y0: b.r * T + T / 2, y: b.r * T + T / 2, ty: b.r * T - 18, t: 0 });
      P.mood = 'joy'; P.moodT = 0.8;
      if (!W.itemHint) { W.itemHint = 1; toast('Đúng rồi! Chữ đã hiện trên hộp. <b>Nhảy lên ăn chữ</b> nhé!', true); }
    } else {
      P.lock[b.key] = W.time + 3;
      P.mood = 'sad'; P.moodT = 1; toast('Sai rồi! Hộp quẻ khóa 3 giây. Đáp án: <b>' + esc(lastRight) + '</b>');
    }
  }
  function addCoin(n) {
    P.coins += n;
    if (Math.floor(P.coins / 50) > Math.floor((P.coins - n) / 50)) { P.lives++; toast('🎉 Đủ 50 xu: <b>+1 mạng</b>!'); }
  }
  function collect(ch) {
    P.got.push(ch);
    const before = P.form;
    P.form = FORM_AT[Math.min(10, P.got.length)];
    toast('<b class="tk">' + ch + '</b> ' + esc(hvOf(ch)) + ' · ' + esc(viOf(ch)) + ' <small>(' + P.got.length + '/' + W.chars.length + ')</small>', true);
    puff(P.x + 12, P.y, '#f59e0b', 14);
    if (P.form > before) evolve(before);
    if (P.got.length >= W.chars.length) setTimeout(() => toast('🎉 Đủ ' + W.chars.length + ' chữ! Chạy tới rương kho báu ở cuối đường!', true), 1800);
  }
  function evolve(from) {
    P.immune = Math.max(P.immune, 0.8);
    W.fx.push({ t: 'evo', x: P.x + 12, y: P.y + 10, life: 0.9 });
    cine(from, P.form);
  }

  // ---------- Yêu quái mực ----------
  function kill(e, how) {
    e.alive = false; e.dead = 0.5; e.how = how;
    if (how === 'bump') { e.vy = -6; }
    P.stomps++; addCoin(2);
    puff(e.x + 13, e.y + 12, '#334155', 10);
  }
  function stepEnemy(e) {
    if (!e.alive) { if (e.how === 'bump') { e.vy += G; e.y += e.vy; } e.dead -= 1 / 60; return; }
    if (Math.abs(e.x - P.x) > VW + 200) return; // chỉ chạy khi gần người chơi
    e.ph += 0.15;
    const front = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
    // quay đầu khi gặp tường hoặc mép vực
    if (e.on && !solidAt(Math.floor(front / T), Math.floor((e.y + e.h + 2) / T))) e.vx = -e.vx;
    moveX(e); if (e.wall) e.vx = e.vx > 0 ? -0.9 : 0.9;
    if (e.vx === 0) e.vx = 0.9;
    e.vy = Math.min(e.vy + G, 12); moveY(e, false);
    if (e.y > VH + 40) e.alive = false;
    if (P.immune > 0 || P.quiz) return;
    if (hit(P, e)) {
      if (P.vy > 0.5 && P.y + P.h - P.vy <= e.y + 8) { kill(e, 'stomp'); P.vy = key.j ? JUMP * 0.85 : -8; P.mood = 'joy'; P.moodT = 0.5; }
      else hurt(e.x + e.w / 2 < P.x + P.w / 2 ? 1 : -1);
    }
  }
  function hurt(dir) {
    if (P.immune > 0) return;
    P.lives--; P.mood = 'sad'; P.moodT = 1.2;
    W.shake = 0.3;
    if (P.lives <= 0) { gameOver(); return; }
    P.immune = 2; P.vx = dir * 6; P.vy = -6;
    toast('Ối! Bị yêu quái mực chạm. Còn <b>' + P.lives + '</b> mạng. Nhảy lên đầu để giẫm nó nhé!');
  }

  // ---------- Điều khiển ----------
  const key = { l: false, r: false, j: false };
  const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'j', w: 'j', W: 'j', ' ': 'j' };
  document.addEventListener('keydown', (e) => {
    if (!W || !W.running) return;
    if (P.quiz && /^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('.tq-opt')[Number(e.key) - 1]; if (b) b.click(); e.preventDefault(); return; }
    if (KEYMAP[e.key]) { key[KEYMAP[e.key]] = true; e.preventDefault(); }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  });
  document.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) key[KEYMAP[e.key]] = false; });
  document.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); key[k] = true; b.classList.add('on'); };
    const off = (e) => { e.preventDefault(); key[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  function togglePause(force) {
    if (!W || !W.running) return;
    W.paused = force != null ? force : !W.paused;
    $('tr-pause').hidden = !W.paused;
  }
  $('tr-pause-btn').onclick = () => togglePause();
  $('tr-resume').onclick = () => togglePause(false);
  $('tr-quit').onclick = () => { W.running = false; menu(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && W && W.running) togglePause(true); });

  // ---------- Câu hỏi ----------
  let lastRight = '';
  function openQuiz(b) {
    const q = makeQuiz(b.ch);
    lastRight = q.right;
    key.l = key.r = key.j = false;
    $('tq-k').textContent = b.ch;
    $('tq-ask').innerHTML = q.ask;
    $('tq-opts').className = 'tq-opts' + (q.jp ? ' jp' : '');
    $('tq-opts').innerHTML = q.opts.map((o, i) => '<button class="tq-opt" data-i="' + i + '"><span>' + (i + 1) + '</span>' + esc(o) + '</button>').join('');
    $('tq-opts').onclick = (e) => {
      const btn = e.target.closest('.tq-opt'); if (!btn || !P.quiz) return;
      const ok = q.opts[Number(btn.dataset.i)] === q.right;
      document.querySelectorAll('.tq-opt').forEach((x) => { x.disabled = true; if (q.opts[Number(x.dataset.i)] === q.right) x.classList.add('right'); else if (x === btn) x.classList.add('wrong'); });
      setTimeout(() => { closeQuiz(); if (P.quiz) answer(ok); }, ok ? 450 : 900);
    };
    $('tr-quiz').hidden = false;
  }
  function closeQuiz() { $('tr-quiz').hidden = true; }

  // ---------- Cập nhật ----------
  function stepPlayer() {
    const inp = P.quiz ? {} : key;
    if (inp.l) { P.vx = Math.max(-MAXV, P.vx - ACC); P.face = -1; }
    else if (inp.r) { P.vx = Math.min(MAXV, P.vx + ACC); P.face = 1; }
    else P.vx *= FRIC;
    if (Math.abs(P.vx) < 0.05) P.vx = 0;
    moveX(P);
    // nhảy: có "coyote time" và nhớ lệnh nhảy để dễ điều khiển hơn
    P.coyote = P.on ? 6 : Math.max(0, P.coyote - 1);
    if (inp.j && !P.jumpHeld) P.jbuf = 7; else P.jbuf = Math.max(0, P.jbuf - 1);
    if (P.jbuf > 0 && P.coyote > 0) { P.vy = JUMP; P.coyote = 0; P.jbuf = 0; }
    P.jumpHeld = !!inp.j;
    if (!inp.j && P.vy < -5) P.vy = -5; // thả nút sớm thì nhảy thấp
    P.vy = Math.min(P.vy + G, 12);
    moveY(P, true);
    if (P.immune > 0) P.immune -= 1 / 60;
    if (P.moodT > 0 && (P.moodT -= 1 / 60) <= 0) P.mood = 'happy';
    // nhớ chỗ đứng an toàn gần nhất để hồi sinh khi rơi vực
    if (P.on && solidAt(Math.floor(P.x / T), Math.floor((P.y + P.h + 1) / T)) && solidAt(Math.floor((P.x + P.w - 1) / T), Math.floor((P.y + P.h + 1) / T))) P.safe = { x: P.x, y: P.y };
    if (P.y > VH + 40) {
      P.lives--; W.shake = 0.3;
      if (P.lives <= 0) { gameOver(); return; }
      const s = P.safe || P.check || W.start; P.x = s.x - P.face * 20; P.y = s.y - 4; if (!P.safe) P.x = s.x; P.vx = P.vy = 0; P.immune = 1.5;
      P.mood = 'sad'; P.moodT = 1;
      toast('Ối, rơi xuống vực! Còn <b>' + P.lives + '</b> mạng.');
    }
    // xu
    W.coins.forEach((co) => { if (!co.got && hit(P, { x: co.x - 10, y: co.y - 12, w: 20, h: 24 })) { co.got = true; addCoin(1); W.pops.push({ x: co.x, y: co.y - 10, t: 0.25, small: 1 }); } });
    // chữ nổi lên trên hộp; phải nhảy lên chạm vào mới lấy được
    P.items = P.items.filter((it) => {
      it.t += 1 / 60;
      const k = Math.min(1, it.t / 0.4), e = 1 - (1 - k) * (1 - k);
      it.y = it.y0 + (it.ty - it.y0) * e + (k >= 1 ? Math.sin(it.t * 4) * 3 : 0);
      if (it.t > 0.35 && hit(P, itemRect(it))) { collect(it.ch); puff(it.x, it.y, '#facc15', 16); return false; }
      return true;
    });
    if (W.flag && !P.check && P.x > W.flag.x) { P.check = { x: W.flag.x - 4, y: W.flag.y + 60 }; toast('🚩 Đã lưu điểm hồi sinh'); }
    if (!P.done && P.got.length >= W.chars.length && hit(P, W.chest)) { P.done = true; finish(); }
    else if (!P.done && hit(P, W.chest) && (!W.chestMsgT || W.time - W.chestMsgT > 2.5)) { W.chestMsgT = W.time; toast('🔒 Rương còn khóa! Cần thêm ' + (W.chars.length - P.got.length) + ' chữ nữa. Quay lại tìm các hộp quẻ 吉 nhé.'); }
  }
  function step() {
    if (W.cine || P.quiz) return;
    W.time += 1 / 60;
    stepPlayer();
    if (W.over) return;
    W.enemies.forEach(stepEnemy);
    W.enemies = W.enemies.filter((e) => e.alive || e.dead > 0);
    W.pops = W.pops.filter((p) => (p.t += 1 / 60) < 0.6);
    W.fx = W.fx.filter((f) => (f.life -= 1 / 60) > 0);
    if (W.shake > 0) W.shake -= 1 / 60;
    const target = P.x - VW * 0.4;
    W.cam += (Math.max(0, Math.min(W.cols * T - VW, target)) - W.cam) * 0.15;
    hud();
  }
  function puff(x, y, color, n) { for (let i = 0; i < (n || 8); i++) W.fx.push({ t: 'dot', x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, life: 0.6, color }); }

  // ---------- Vẽ ----------
  const SCN = window.SUMI_SCENES || {};
  const scene = () => SCN[W.M.theme] || SCN.hanoi;
  function draw() {
    const sc = scene(), t = performance.now() / 1000;
    const sh = W.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.save(); sc.back(ctx, W.cam, VW, t, W.cols * T); ctx.restore();
    ctx.save(); ctx.translate(-Math.round(W.cam) + sh, 0);
    SCN.pitWater(ctx, W.cam, VW, sc.pit, t);
    if (sc.front) { ctx.save(); sc.front(ctx, W.cam, VW, t); ctx.restore(); }
    const c0 = Math.max(0, Math.floor(W.cam / T) - 1), c1 = Math.min(W.cols - 1, Math.ceil((W.cam + VW) / T) + 1);
    for (let c = 6; c < W.cols; c += 11) if (c >= c0 - 3 && c <= c1 && tileAt(c, 13) === '#' && tileAt(c, 12) === ' ' && tileAt(c + 1, 12) === ' ' && tileAt(c, 11) === ' ') { ctx.save(); sc.decor(ctx, c * T, c); ctx.restore(); }
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) tile(W.grid[r][c], c, r);
    W.coins.forEach((co) => { if (!co.got && co.x > W.cam - 20 && co.x < W.cam + VW + 20) coin(co.x, co.y + Math.sin(t * 3 + co.x) * 2, 1); });
    W.pops.forEach((p) => { const k = p.t / 0.6; ctx.globalAlpha = 1 - k; coin(p.x, p.y - 40 * Math.sin(k * Math.PI * 0.8), Math.abs(Math.cos(k * 12))); ctx.globalAlpha = 1; });
    if (W.flag) flag(W.flag, P.check);
    chest(W.chest);
    P.items.forEach(kanjiItem);
    W.enemies.forEach(enemy);
    W.fx.forEach(fxDraw);
    drawPlayer();
    ctx.restore();
  }
  function coin(x, y, sx) {
    // đồng xu lỗ vuông
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.15, sx), 1);
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(-2.5, -2.5, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  function enemy(e) {
    // yêu quái mực: giọt mực đen có 2 sừng nhỏ
    const x = e.x, y = e.y, sq = !e.alive && e.how === 'stomp';
    ctx.save(); ctx.translate(x + e.w / 2, y + e.h);
    if (sq) { ctx.globalAlpha = Math.max(0, e.dead / 0.5); ctx.scale(1.3, 0.35); }
    if (!e.alive && e.how === 'bump') ctx.scale(1, -1), ctx.translate(0, e.h);
    const wob = e.alive ? Math.sin(e.ph) * 1.5 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-15, -14 - wob, -6, -22); ctx.quadraticCurveTo(0, -26, 6, -22); ctx.quadraticCurveTo(15, -14 + wob, 13, 0);
    ctx.quadraticCurveTo(9, -3, 6, 0); ctx.quadraticCurveTo(3, -3, 0, 0); ctx.quadraticCurveTo(-3, -3, -6, 0); ctx.quadraticCurveTo(-9, -3, -13, 0);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-10, -28); ctx.lineTo(-4, -23); ctx.moveTo(8, -20); ctx.lineTo(10, -28); ctx.lineTo(4, -23); ctx.fill();
    const d = e.vx > 0 ? 2 : -2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-5 + d, -13, 4, 5, 0, 0, 7); ctx.ellipse(5 + d, -13, 4, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(-5 + d * 1.5, -12, 2, 0, 7); ctx.arc(5 + d * 1.5, -12, 2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4 + d, -5); ctx.lineTo(-1 + d, -7); ctx.lineTo(2 + d, -5); ctx.lineTo(5 + d, -7); ctx.stroke();
    ctx.restore();
  }
  function tile(ch, c, r) {
    const x = c * T, y = r * T;
    let dy = 0;
    if (W.bump && W.bump.c === c && W.bump.r === r) { dy = -6 * (W.bump.t / 0.15); W.bump.t -= 1 / 120; if (W.bump.t <= 0) W.bump = null; }
    if (ch === '#') {
      const gc = scene().ground, top = tileAt(c, r - 1) !== '#';
      ctx.fillStyle = gc.body; ctx.fillRect(x - 0.5, y, T + 1, T + 0.5);
      ctx.fillStyle = gc.dot;
      if (gc.brick) { ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x + (r % 2 ? 8 : 24), y, 2, 15); ctx.fillRect(x + (r % 2 ? 24 : 8), y + 17, 2, 15); }
      else if (gc.tile) { ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T); }
      else { ctx.fillRect(x + 6, y + 14, 4, 4); ctx.fillRect(x + 20, y + 24, 4, 4); }
      if (top) { ctx.fillStyle = gc.top; ctx.fillRect(x - 0.5, y, T + 1, 9); ctx.fillStyle = gc.top2; ctx.fillRect(x - 0.5, y + 9, T + 1, 3); }
    } else if (ch === 'X') {
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#b8bec7'; ctx.beginPath(); ctx.ellipse(x + 9, y + 9, 7, 6, 0, 0, 7); ctx.ellipse(x + 23, y + 12, 7, 7, 0, 0, 7); ctx.ellipse(x + 12, y + 24, 8, 6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
    } else if (ch === 'B') {
      ctx.fillStyle = '#c8935a'; ctx.fillRect(x, y + dy, T, T);
      ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1.5, y + 1.5 + dy, T - 3, T - 3);
      ctx.beginPath(); ctx.moveTo(x + 3, y + 3 + dy); ctx.lineTo(x + T - 3, y + T - 3 + dy); ctx.moveTo(x + T - 3, y + 3 + dy); ctx.lineTo(x + 3, y + T - 3 + dy); ctx.stroke();
      ctx.fillStyle = '#e0b07a'; ctx.fillRect(x + 4, y + 4 + dy, T - 8, 3);
    } else if (ch === '?' || ch === 'U') {
      // hộp xu: hộp sơn mài xanh ngọc, có hình đồng xu; mở rồi thì sẫm màu
      const used = ch === 'U';
      ctx.fillStyle = used ? '#8a7f72' : '#0f766e'; ctx.fillRect(x, y + dy, T, T);
      ctx.strokeStyle = used ? '#5c544b' : '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2 + dy, T - 4, T - 4);
      if (!used) { ctx.save(); coin(x + 16, y + 16 + dy, Math.abs(Math.cos(performance.now() / 400 + c))); ctx.restore(); }
      else { ctx.fillStyle = '#5c544b'; ctx.fillRect(x + 6, y + 6, 3, 3); ctx.fillRect(x + T - 9, y + 6, 3, 3); ctx.fillRect(x + 6, y + T - 9, 3, 3); ctx.fillRect(x + T - 9, y + T - 9, 3, 3); }
    } else if (ch === 'Q') {
      const b = W.boxes.find((q) => q.r === r && q.c === c);
      const mine = b && P.opened.has(b.key);
      const locked = b && P.lock[b.key] > W.time;
      // hộp quẻ おみくじ: thân đỏ, nắp trắng, chữ 吉
      ctx.fillStyle = mine ? '#d6c4b0' : '#dc2626'; ctx.fillRect(x + 2, y + 6 + dy, T - 4, T - 6);
      ctx.fillStyle = mine ? '#efe6dc' : '#fff7ed'; ctx.fillRect(x, y + dy, T, 9);
      ctx.strokeStyle = mine ? '#a8977f' : '#7f1d1d'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1 + dy, T - 2, T - 2);
      ctx.fillStyle = mine ? '#a8977f' : '#fde68a'; ctx.font = '700 16px "Klee One", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mine ? '済' : '吉', x + 16, y + 21 + dy + (mine ? 0 : Math.sin(performance.now() / 300 + c) * 1.2));
      if (locked) { ctx.fillStyle = 'rgba(30,41,59,.55)'; ctx.fillRect(x, y + dy, T, T); ctx.fillStyle = '#fff'; ctx.font = '800 12px sans-serif'; ctx.fillText(Math.ceil(P.lock[b.key] - W.time) + 's', x + 16, y + 17 + dy); }
    }
  }
  function kanjiItem(it) {
    const cx = it.x, cy = it.y;
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 32);
    glow.addColorStop(0, 'rgba(255, 236, 140, .95)'); glow.addColorStop(1, 'rgba(255, 236, 140, 0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 32, 0, 7); ctx.fill();
    ctx.fillStyle = '#fffdf2'; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - 17, cy - 17, 34, 34, 8) : ctx.rect(cx - 17, cy - 17, 34, 34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7c2d12'; ctx.font = '600 24px "Klee One", "Hiragino Mincho ProN", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.ch, cx, cy + 1);
    if (it.t > 0.4) { const b = Math.sin(it.t * 6) * 3; ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 30 + b); ctx.lineTo(cx + 7, cy - 30 + b); ctx.lineTo(cx, cy - 22 + b); ctx.fill(); }
    ctx.restore();
  }
  function fxDraw(f) {
    if (f.t === 'dot') { f.x += f.vx; f.y += f.vy; f.vy += 0.3; ctx.globalAlpha = Math.max(0, f.life / 0.6); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.t === 'evo') {
      const k = f.life / 0.9;
      ctx.globalAlpha = k; ctx.fillStyle = '#fff7c2';
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + W.time * 3; ctx.beginPath(); ctx.arc(P.x + 12 + Math.cos(a) * (50 - k * 30), P.y + 10 + Math.sin(a) * (50 - k * 30), 4, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  function flag(f, on) {
    ctx.fillStyle = '#78716c'; ctx.fillRect(f.x, f.y, 4, f.h);
    ctx.fillStyle = on ? '#22c55e' : '#ef4444'; ctx.beginPath(); ctx.moveTo(f.x + 4, f.y + 4); ctx.lineTo(f.x + 30, f.y + 14); ctx.lineTo(f.x + 4, f.y + 24); ctx.fill();
  }
  function chest(ch) {
    const full = P.got.length >= W.chars.length;
    const x = ch.x, y = ch.y;
    if (full) { const g = ctx.createRadialGradient(x + 20, y + 10, 4, x + 20, y + 10, 60); g.addColorStop(0, 'rgba(255,220,100,.8)'); g.addColorStop(1, 'rgba(255,220,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 20, y + 10, 60, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#92400e'; ctx.fillRect(x, y + 8, 40, 20); ctx.fillStyle = '#b45309'; ctx.fillRect(x, y, 40, 12);
    ctx.fillStyle = '#facc15'; ctx.fillRect(x, y + 10, 40, 3); ctx.fillRect(x + 17, y + 7, 6, 10);
    if (!full) { ctx.fillStyle = '#57534e'; ctx.fillRect(x + 15, y - 14, 10, 8); ctx.strokeStyle = '#57534e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 20, y - 14, 4, Math.PI, 0); ctx.stroke(); }
  }
  function drawPlayer() {
    if (P.immune > 0 && Math.floor(P.immune * 10) % 2) return;
    const mood = P.quiz ? 'think' : P.mood;
    const im = img(P.form, mood);
    const sz = 40 + P.form * 1.5;
    ctx.save();
    ctx.translate(P.x + P.w / 2, P.y + P.h);
    ctx.scale(P.face, 1);
    if (im.complete) ctx.drawImage(im, -sz / 2, -sz + 2, sz, sz * 0.93);
    ctx.restore();
  }

  // ---------- Giao diện ----------
  function hud() {
    $('tr-slots').innerHTML = W.chars.map((c) => '<span class="' + (P.got.includes(c) ? 'got' : '') + '">' + (P.got.includes(c) ? c : '?') + '</span>').join('');
    $('tr-me-form').textContent = HIYO.NAMES[P.form] + ' · ' + P.got.length + '/' + W.chars.length + ' chữ';
    if (W.lastMeForm !== P.form) { W.lastMeForm = P.form; $('tr-me-av').innerHTML = HIYO.svg(P.form, 'happy', { cls: 'tr-av-svg' }); }
    $('tr-lives').textContent = Math.max(0, P.lives);
    $('tr-coins').textContent = P.coins;
    $('tr-time').textContent = Math.floor(W.time);
  }
  let toastT = null;
  function toast(html, big) {
    const t = $('tr-toast'); t.innerHTML = html; t.className = 'tr-toast show' + (big ? ' big' : '');
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'tr-toast'; }, big ? 2400 : 1800);
  }

  // ---------- Vòng lặp ----------
  let raf = null, acc = 0, last = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!W) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (W.running && !W.paused && !W.over) { acc += dt; while (acc >= 1 / 60) { step(); acc -= 1 / 60; if (W.over) break; } }
    draw();
  }

  // ---------- Bắt đầu màn ----------
  let mapIdx = 0;
  function startMatch(map) {
    cineQ.length = 0; $('tr-evo').hidden = true;
    W = loadWorld(map, pickChars(10));
    P = newPlayer();
    W.cam = 0;
    ['tr-menu', 'tr-end', 'tr-pause'].forEach((id) => { $(id).hidden = true; });
    closeQuiz();
    resize(); hud();
    countdown(() => {
      W.running = true;
      toast('Đập đầu vào <b>hộp quẻ 吉</b> để tìm chữ, giẫm lên đầu <b>yêu quái mực</b>. Đủ <b>' + W.chars.length + ' chữ</b> thì mở rương ở cuối đường!', true);
    });
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function postcard(M) {
    return '<div class="tr-post ' + M.theme + '"><small>Hành trình Việt Nam · chặng ' + (MAPS.indexOf(M) + 1) + '/' + MAPS.length + '</small>' +
      '<h3>' + esc(M.city) + ' · ' + esc(M.name) + '</h3><p>' + esc(M.vi) + '</p><p class="en">' + esc(M.en) + '</p><b class="tr-cd"></b></div>';
  }
  function countdown(done) {
    const el = $('tr-count'); let n = 4;
    el.hidden = false; el.innerHTML = postcard(W.M);
    const cd = el.querySelector('.tr-cd');
    const show = () => { cd.textContent = n > 3 ? '' : n > 0 ? n : 'GO!'; cd.className = 'tr-cd' + (n <= 3 ? ' on' : ''); };
    show();
    const t = setInterval(() => { n--; if (n >= 0) show(); else { clearInterval(t); el.hidden = true; done(); } }, 800);
  }

  // ---------- Màn tiến hóa phóng to ----------
  const cineQ = [];
  function cine(from, to) {
    cineQ.push({ from, to });
    if (cineQ.length === 1) playCine();
  }
  function playCine() {
    const c = cineQ[0];
    if (!c || !W || W.over) { cineQ.length = 0; return; }
    P.vx = 0; key.l = key.r = key.j = false;
    W.cine = true;
    const box = $('tr-evo');
    box.innerHTML = '<div class="ev-stage ev-evo"><div class="ev-rays"></div>' +
      '<div class="ev-old">' + HIYO.svg(c.from, 'wow', { cls: 'ev-svg' }) + '</div>' +
      '<div class="ev-new">' + HIYO.svg(c.to, 'joy', { cls: 'ev-svg' }) + '</div><div class="ev-flash"></div>' +
      '<div class="ev-txt"><small>Tiến hóa!</small><b>' + esc(HIYO.NAMES[c.from]) + ' → ' + esc(HIYO.NAMES[c.to]) + '</b><em>' + P.got.length + '/' + W.chars.length + ' chữ</em></div></div>' +
      '<span class="ev-skip">Chạm để tiếp tục</span>';
    box.hidden = false;
    const t0 = Date.now();
    const end = () => {
      clearTimeout(tm); box.hidden = true; box.onclick = null; document.removeEventListener('keydown', onKey, true);
      P.immune = Math.max(P.immune, 1); W.cine = false;
      cineQ.shift(); if (cineQ.length) playCine();
    };
    const onKey = (e) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (Date.now() - t0 > 500) end(); } };
    const tm = setTimeout(end, 2700);
    box.onclick = () => { if (Date.now() - t0 > 500) end(); };
    document.addEventListener('keydown', onKey, true);
  }

  // ---------- Kết thúc ----------
  function stars() { const total = W.coins.length + (W.M.map.join('').split('?').length - 1); return 1 + (P.coins >= total * 0.6 ? 1 : 0) + (P.lives >= LIVES ? 1 : 0); }
  function finish() {
    if (W.over) return;
    W.over = true; W.running = false; W.cine = false;
    closeQuiz();
    const st = stars();
    const sv = store.get(SAVE, {});
    const k = levelId + ':' + W.M.id;
    const prev = sv[k] || {};
    sv[k] = { done: 1, best: prev.best ? Math.min(prev.best, Math.floor(W.time)) : Math.floor(W.time), stars: Math.max(prev.stars || 0, st), coins: Math.max(prev.coins || 0, P.coins) };
    store.set(SAVE, sv);
    const xp = P.got.length ? Sumi.addXP(Math.min(10, P.got.length)) : null;
    const next = MAPS[W.i + 1];
    endScreen('🎉 Mở được kho báu!', 'joy',
      '<div class="tr-stars">' + [1, 2, 3].map((i) => '<i class="' + (i <= st ? 'on' : '') + '">★</i>').join('') + '</div>' +
      '<p>' + esc(W.M.city) + ' · ' + esc(W.M.name) + ' · ' + Math.floor(W.time) + ' giây · ' + P.coins + ' xu · giẫm ' + P.stomps + ' yêu quái · còn ' + P.lives + ' mạng' + (xp ? ' · +' + Math.min(10, P.got.length) + '⭐' : '') + '</p>' +
      '<p class="tr-sub">★ qua màn · ★ nhặt ≥60% xu · ★ không mất mạng nào</p>',
      next ? '<button class="act-btn primary" id="tr-next">▶ Tới ' + esc(next.city) + '</button>' : '');
    if ($('tr-next')) $('tr-next').onclick = () => { mapIdx = W.i + 1; startMatch(mapIdx); };
    if (xp && xp.goalJustMet && window.sumiGoalCelebrate) sumiGoalCelebrate(xp);
  }
  function gameOver() {
    if (W.over) return;
    W.over = true; W.running = false; W.cine = false; P.lives = 0;
    closeQuiz(); hud();
    const xp = P.got.length ? Sumi.addXP(Math.min(10, P.got.length)) : null;
    endScreen('💧 Hết mạng rồi!', 'sad', '<p>Bạn đã tìm được <b>' + P.got.length + '/' + W.chars.length + '</b> chữ, nhặt ' + P.coins + ' xu' + (xp ? ' · +' + Math.min(10, P.got.length) + '⭐' : '') + '. Thử lại nhé, nhớ giẫm lên đầu yêu quái mực!</p>', '');
  }
  function endScreen(title, mood, body, extraBtn) {
    $('tr-end').innerHTML = '<div class="tr-end-in">' + HIYO.svg(P.form, mood, { cls: 'tr-hiyo' }) + '<h2>' + title + '</h2>' + body +
      '<div class="tr-loot">' + W.chars.map((c) => '<span class="' + (P.got.includes(c) ? '' : 'miss') + '"><b>' + c + '</b><em>' + esc(hvOf(c)) + '</em><small>' + esc(viOf(c)) + '</small></span>').join('') + '</div>' +
      '<p class="tr-fact">🇻🇳 ' + esc(W.M.vi) + '<br><i>' + esc(W.M.en) + '</i></p>' +
      '<div class="tr-acts">' + extraBtn + '<button class="act-btn" id="tr-again">↺ Chơi lại</button><button class="act-btn" id="tr-menu-btn">🗺 Về menu</button></div></div>';
    $('tr-end').hidden = false;
    $('tr-again').onclick = () => startMatch(W.i);
    $('tr-menu-btn').onclick = menu;
  }

  // ---------- Menu ----------
  function menu() {
    const sv = store.get(SAVE, {});
    ['tr-end', 'tr-pause'].forEach((id) => { $(id).hidden = true; });
    closeQuiz();
    $('tr-levels').innerHTML = MAPS.map((m, i) => {
      const s = sv[levelId + ':' + m.id];
      const open = i === 0 || sv[levelId + ':' + MAPS[i - 1].id];
      return '<button class="tr-lv ' + m.theme + (open ? '' : ' lock') + (i === mapIdx ? ' on' : '') + '" data-i="' + i + '"' + (open ? '' : ' disabled') + '><b>' + esc(m.city) + '</b><span>' + esc(m.name) + '</span><small>' +
        (s ? '★'.repeat(s.stars || 1) + '☆'.repeat(3 - (s.stars || 1)) + ' · ' + s.best + ' giây' : open ? 'Chưa qua' : '🔒 Qua màn trước để mở') + '</small></button>';
    }).join('');
    $('tr-menu').hidden = false;
  }
  $('tr-levels').addEventListener('click', (e) => { const b = e.target.closest('.tr-lv'); if (b && !b.disabled) { mapIdx = Number(b.dataset.i); menu(); } });
  $('tr-go').onclick = () => startMatch(mapIdx);

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  document.title = 'Hiyo truy tìm kho báu – ' + levelName + ' – Sumi Kanji';
  $('tr-menu-hiyo').innerHTML = HIYO.svg(currentForm(), 'cheer', { cls: 'tr-hiyo' });
  $('tr-menu-sub').textContent = 'Chữ giấu trong hộp quẻ lấy từ ' + levelName + ' (ưu tiên chữ bạn đã học).';
  resize();
  $('tr-go').disabled = true;
  sumiLoadLevel(levelId).then((d) => {
    data = d;
    $('tr-go').disabled = false;
    menu();
    // nền phía sau menu
    W = loadWorld(0, pickChars(10)); P = newPlayer(); hud(); draw();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }).catch((err) => toast(esc(err.message), true));
  window.__sumiTreasureP = () => P;
  window.__sumiTreasureStart = (i) => startMatch(i || 0);
})();
