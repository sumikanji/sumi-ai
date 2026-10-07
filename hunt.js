/*! © 2026 Sumi Kanji */
// ===== Săn cầu chữ: dẫn Hiyo đi tìm các quả cầu ngọc chứa chữ Kanji nấp trong bụi cỏ, trả lời đúng 3 câu để thu phục =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = window.sumiEsc || ((t) => String(t));
  const params = new URLSearchParams(location.search);
  const PATH = window.SumiPath;
  const levelId = LEVELS[params.get('level')] ? params.get('level') : (PATH && PATH.current()) || 'g1';
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const IDX = window.SUMI_INDEX || {};
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1].split(/[;,]/)[0].trim() : '');
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const SAVE = 'sumiKanji.hunt';
  const T = 32, MW = 46, MH = 34, ACTIVE = 6, SPEED = 2.3;
  const SFX = window.HuntSFX || { init() {}, play() {}, musicStart() {}, setDuck() {}, toggle() { return false; }, pref: () => ({}) };
  const RAR = [null, { name: 'Thường', color: '#22c55e', xp: 1 }, { name: 'Hiếm', color: '#3b82f6', xp: 2 }, { name: 'Quý', color: '#a855f7', xp: 3 }];
  let data = {}, chars = [];

  // ---------- Sổ sưu tập ----------
  const book = () => (store.get(SAVE, {})[levelId] || {});
  const fmtDay = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => fmtDay(new Date());
  const addDay = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return fmtDay(d); };
  function saveCatch(c, shiny) {
    const all = store.get(SAVE, {}); const b = all[levelId] || {};
    const prev = b[c];
    b[c] = { n: (prev ? prev.n : 0) + 1, sh: (prev && prev.sh) || (shiny ? 1 : 0), day: (prev && prev.day) || today(), due: (prev && prev.due) || addDay(today(), 1), iv: (prev && prev.iv) || 1 };
    all[levelId] = b; store.set(SAVE, all);
    return !prev;
  }
  // chữ cũ chưa có lịch ôn → hẹn ôn từ ngày mai
  (function migrate() { const all = store.get(SAVE, {}); let ch = false; Object.values(all).forEach((b) => Object.values(b).forEach((e) => { if (!e.due) { e.due = addDay(today(), 1); e.iv = 1; e.day = e.day || today(); ch = true; } })); if (ch) store.set(SAVE, all); })();
  // level nhân vật = tổng số chữ khác nhau đã thu phục (tối đa 2136 chữ thường dụng)
  const LV_MAX = 2136;
  function heroLevel() { const set = new Set(); Object.values(store.get(SAVE, {})).forEach((b) => Object.keys(b).forEach((c) => set.add(c))); return Math.min(LV_MAX, set.size); }
  function dueList() { const out = [], td = today(); Object.entries(store.get(SAVE, {})).forEach(([lv, b]) => Object.entries(b).forEach(([c, e]) => { if (e.due && e.due <= td) out.push({ lv, c }); })); return out; }
  // ---------- Nhân vật & phụ kiện ----------
  const GEAR = window.HuntGear;
  const HSAVE = 'sumiKanji.huntHero';
  const hero = Object.assign({ gear: {}, eq: {}, kills: 0, gold: 0, name: 'Hiyo' }, store.get(HSAVE, {}));
  const saveHero = () => store.set(HSAVE, hero);
  const has = (id) => Object.values(hero.eq).includes(id);
  const rarity = (c) => { const s = (data[c] && data[c].s) || 5; return s <= 5 ? 1 : s <= 9 ? 2 : 3; };

  // ---------- Bản đồ (sinh ngẫu nhiên nhưng cố định theo cấp học) ----------
  // 0 cỏ · 1 cỏ cao · 2 cây · 3 nước · 4 đường đất · 5 hoa · 6 đá
  let seed = 1;
  for (const ch of levelId) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const SOLID = new Set([2, 3, 6, 7, 8]); // 7 đá tiến hoá · 8 đá vừa vỡ
  const map = [];
  let start = { x: 0, y: 0 };
  function blob(cx, cy, r, v, only) {
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1) continue;
      const d = Math.hypot(x - cx, (y - cy) * 1.1) + rnd() * 1.2;
      if (d <= r && (only == null || map[y][x] === only)) map[y][x] = v;
    }
  }
  function genMap() {
    for (let y = 0; y < MH; y++) { map[y] = []; for (let x = 0; x < MW; x++) map[y][x] = (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) ? 2 : 0; }
    for (let i = 0; i < 4; i++) blob(4 + Math.floor(rnd() * (MW - 8)), 4 + Math.floor(rnd() * (MH - 8)), 2 + Math.floor(rnd() * 2), 3);
    for (let i = 0; i < 16; i++) blob(3 + Math.floor(rnd() * (MW - 6)), 3 + Math.floor(rnd() * (MH - 6)), 2 + Math.floor(rnd() * 2.5), 1, 0);
    for (let i = 0; i < 90; i++) { const x = 1 + Math.floor(rnd() * (MW - 2)), y = 1 + Math.floor(rnd() * (MH - 2)); if (map[y][x] === 0) map[y][x] = rnd() < 0.75 ? 2 : 6; }
    for (let i = 0; i < 60; i++) { const x = 1 + Math.floor(rnd() * (MW - 2)), y = 1 + Math.floor(rnd() * (MH - 2)); if (map[y][x] === 0) map[y][x] = 5; }
    // đường đất hình chữ thập qua giữa bản đồ
    const cy = Math.floor(MH / 2), cx = Math.floor(MW / 2);
    for (let x = 1; x < MW - 1; x++) for (const y of [cy, cy + 1]) map[y][x] = 4;
    for (let y = 1; y < MH - 1; y++) for (const x of [cx, cx + 1]) map[y][x] = 4;
    start = { x: cx * T + 6, y: cy * T + 8 };
    // ô không đi tới được → biến thành cây
    const seen = new Set([cx + ',' + cy]); const q = [[cx, cy]];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && !SOLID.has(map[ny][nx])) { seen.add(k); q.push([nx, ny]); } } }
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (!SOLID.has(map[y][x]) && !seen.has(x + ',' + y)) map[y][x] = 2;
  }
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? 2 : map[y][x]);
  const solidPx = (px, py) => SOLID.has(tileAt(Math.floor(px / T), Math.floor(py / T)));

  // ---------- Người chơi & cầu chữ ----------
  const P = { x: 0, y: 0, w: 20, h: 14, face: 1, walk: 0, target: null };
  let orbs = [], fx = [], running = false, enc = null, cam = { x: 0, y: 0 };
  window.__sumiHunt = () => ({ P, orbs, map, enc, cap, running, wanted, G, hero, drops: () => drops, monsters: () => monsters, golds: () => golds, shots: () => shots, bumpStone: (x, y) => bumpStone(x, y), segReading, makeQ: (c, k) => makeQ(c, k), answer: (i) => pickOpt(i), lastRight: () => (enc && enc.q ? enc.q.right : null) });

  function grassCells() { const a = []; for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (map[y][x] === 1) a.push([x, y]); return a; }
  function chooseChar() {
    const b = book(); const active = new Set(orbs.map((o) => o.ch));
    const free = chars.filter((c) => !active.has(c));
    const fresh = free.filter((c) => !b[c]);
    return fresh.length && Math.random() < 0.75 ? rand(fresh) : rand(free.length ? free : chars);
  }
  function placeOrb(o, far) {
    const cells = grassCells().filter(([x, y]) => !orbs.some((q) => q !== o && q.tx === x && q.ty === y) && Math.hypot(x * T - P.x, y * T - P.y) > (far ? 10 : 5) * T);
    const [x, y] = rand(cells.length ? cells : grassCells());
    o.tx = x; o.ty = y;
  }
  function spawnOrb() {
    const ch = chooseChar(); if (!ch) return;
    const o = { ch, rar: rarity(ch), shiny: Math.random() < 0.06 };
    placeOrb(o); orbs.push(o);
  }
  const orbPos = (o) => ({ x: o.tx * T + 16, y: o.ty * T + 16 });

  // ---------- Lệnh truy nã: chỉ có 1 cầu đúng, còn lại là cầu nhử ----------
  let wanted = null;
  function newWanted() {
    const ch = chooseChar();
    if (!ch) return;
    wanted = { ch, t: 0, miss: 0, hint: 0, shown: -1 };
    const pool = shuffle(chars.filter((c) => c !== ch && viOf(c) !== viOf(ch)));
    const same = pool.filter((c) => rarity(c) === rarity(ch)).slice(0, 3);
    const decoys = same.concat(pool.filter((c) => !same.includes(c))).slice(0, ACTIVE - 1);
    orbs = [];
    const tg = { ch, rar: rarity(ch), shiny: Math.random() < 0.06, target: true };
    placeOrb(tg, true); orbs.push(tg);
    decoys.forEach((c) => { const o = { ch: c, rar: rarity(c), shiny: false }; placeOrb(o); orbs.push(o); });
    poster(true);
  }
  function poster(fresh) {
    if (!wanted) return;
    const w = wanted;
    if (w.shown === 1 && !fresh) return; w.shown = 1;
    $('hn-wanted').innerHTML = '<div class="hw-head">TRUY NÃ</div>' +
      '<div class="hw-k">' + w.ch + '</div>' +
      '<div class="hw-hv">' + esc(hvOf(w.ch) || '') + '</div>' +
      '<div class="hw-vi">' + esc(viOf(w.ch)) + '</div>';
    if (fresh) { const el = $('hn-wanted'); el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
    $('hn-near').textContent = '';
  }
  function decoy(o) {
    wanted.miss++;
    o.cool = 2.5;
    const p = orbPos(o);
    for (let i = 0; i < 14; i++) fx.push({ t: 'conf', x: p.x, y: p.y - 8, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 4, r: 2.5 + Math.random() * 2, c: i % 2 ? '#94a3b8' : '#f87171', life: 0.9 });
    fx.push({ t: 'txt', x: p.x, y: p.y - 30, s: 'Cầu nhử!', c: '#ef4444', life: 1 });
    SFX.play('wrong');
    toast('✕ Không phải! <b class="tk">' + o.ch + '</b> ' + esc(hvOf(o.ch)) + ' nghĩa là “' + esc(viOf(o.ch)) + '”. Cần bắt chữ nghĩa “' + esc(viOf(wanted.ch)) + '”.');
    placeOrb(o);
    poster();
  }

  // ---------- Hành động: mạng, vàng, đá tiến hoá, đạn, quái thú ----------
  const maxLife = () => 5 + (has('bag') ? 1 : 0);
  const WEAP = [
    { name: 'Đạn tròn', n: 1, spread: 0, par: 0, r: 4, sp: 5.5, dmg: 1, cd: 0.34, col: '#fde047' },
    { name: 'Đạn lửa', n: 1, spread: 0, par: 0, r: 5.5, sp: 6.5, dmg: 2, cd: 0.28, col: '#fb923c' },
    { name: 'Đạn đôi', n: 2, spread: 0, par: 8, r: 5, sp: 6.5, dmg: 2, cd: 0.26, col: '#38bdf8' },
    { name: 'Đạn quạt', n: 3, spread: 0.28, par: 0, r: 5, sp: 6.8, dmg: 2, cd: 0.25, col: '#a78bfa' },
    { name: 'Cầu sấm', n: 3, spread: 0.24, par: 0, r: 7.5, sp: 7.2, dmg: 3, cd: 0.22, col: '#f472b6', pierce: true }
  ];
  const FORM_OF = [0, 2, 4, 6, 8]; // cấp tiến hoá → dạng Hiyo
  const G = { lives: 3, coins: 0, lv: 0, inv: 0, cd: 0, shake: 0, over: false, fire: false, caught: 0, kills: 0, stoneT: [], spawnT: 4, armorT: 0, swordT: 0, haloT: 0, trailT: 0, nextLife: 50 };
  let flames = [], drops = [];
  let monsters = [], shots = [], golds = [];
  const walkable = (v) => v === 0 || v === 1 || v === 4 || v === 5;
  function randomCell(minDist, test) {
    for (let i = 0; i < 400; i++) {
      const x = 1 + Math.floor(Math.random() * (MW - 2)), y = 1 + Math.floor(Math.random() * (MH - 2));
      if (!walkable(map[y][x]) || (test && !test(x, y))) continue;
      if (Math.hypot(x * T + 16 - (P.x + P.w / 2), y * T + 16 - (P.y + P.h / 2)) < minDist * T) continue;
      return [x, y];
    }
    return null;
  }
  // đá tiến hoá: chỉ đặt ở ô mà 4 phía đều đi được để không chặn đường
  function placeStone() {
    const c = randomCell(4, (x, y) => map[y][x] !== 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => walkable(map[y + b][x + a])) && !orbs.some((o) => o.tx === x && o.ty === y));
    if (c) map[c[1]][c[0]] = 7;
  }
  function placeGold(x, y) {
    if (x == null) { const c = randomCell(3); if (!c) return; x = c[0] * T + 16; y = c[1] * T + 16; }
    golds.push({ x, y, ph: Math.random() * 6 });
  }
  function spawnMonster() {
    const c = randomCell(9); if (!c) return;
    const bat = Math.random() < 0.35;
    monsters.push({ bat, x: c[0] * T + 7, y: c[1] * T + 9, w: 18, h: 14, hp: bat ? 1 : 3, max: bat ? 1 : 3, sp: bat ? 1.55 : 1.0, dx: 0, dy: 0, t: 0, flash: 0, ph: Math.random() * 6 });
  }
  function setupWorld() {
    monsters = []; shots = []; golds = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (map[y][x] === 7 || map[y][x] === 8) map[y][x] = 0;
    for (let i = 0; i < 5; i++) placeStone();
    for (let i = 0; i < 36; i++) placeGold();
    for (let i = 0; i < 6; i++) spawnMonster();
    G.stoneT = [];
  }
  function moveEnt(e, dx, dy) {
    let hit = false;
    const L = e.x, R = e.x + e.w - 1, U = e.y, D = e.y + e.h - 1;
    if (dx) { const nx = dx > 0 ? R + dx : L + dx; if (!solidPx(nx, U) && !solidPx(nx, D)) e.x += dx; else hit = true; }
    if (dy) { const ny = dy > 0 ? D + dy : U + dy; if (!solidPx(L, ny) && !solidPx(R, ny)) e.y += dy; else hit = true; }
    return hit;
  }
  const pc = () => ({ x: P.x + P.w / 2, y: P.y + P.h / 2 });
  function addLife(n, why) {
    const before = G.lives; G.lives = Math.min(maxLife(), G.lives + n);
    if (G.lives > before) { SFX.play('life'); fx.push({ t: 'txt', x: pc().x, y: P.y - 34, s: '+1 mạng', c: '#e11d48', life: 1.2 }); if (why) toast(why); }
    hud();
  }
  // húc vào đá tiến hoá
  function bumpStone(x, y) {
    map[y][x] = 8; // đá vỡ
    setTimeout(() => { if (map[y][x] === 8) map[y][x] = 0; }, 600);
    G.stoneT.push(25); // 25 giây sau mọc viên mới
    SFX.play('bump');
    const cx = x * T + 16, cy = y * T + 16;
    for (let i = 0; i < 16; i++) fx.push({ t: 'conf', x: cx, y: cy, vx: (Math.random() - 0.5) * 6, vy: -1 - Math.random() * 4, r: 2.5 + Math.random() * 3, c: i % 2 ? '#fb923c' : '#fde047', life: 1 });
    if (G.lv < WEAP.length - 1) {
      G.lv++;
      SFX.play('evolve', 0, 0.1);
      fx.push({ t: 'ring', x: pc().x, y: P.y - 6, life: 0.8, c: WEAP[G.lv].col });
      fx.push({ t: 'txt', x: pc().x, y: P.y - 40, s: 'Tiến hoá!', c: '#7c3aed', life: 1.3 });
      toast('✨ Tiến hoá thành <b>' + esc(HIYO.NAMES[FORM_OF[G.lv]]) + '</b>! Đạn mới: <b>' + WEAP[G.lv].name + '</b>');
      G.inv = Math.max(G.inv, 1);
    } else { G.coins += 10; SFX.play('coin'); fx.push({ t: 'txt', x: pc().x, y: P.y - 40, s: '+10 vàng', c: '#ca8a04', life: 1 }); }
    hud();
  }
  function aimDir() {
    // tự nhắm quái thú gần nhất trong tầm, nếu không thì bắn theo hướng đang đi
    const c = pc(); let best = null, bd = 7 * T;
    monsters.forEach((m) => { const d = Math.hypot(m.x + m.w / 2 - c.x, m.y + m.h / 2 - c.y); if (d < bd) { bd = d; best = m; } });
    if (best) { const dx = best.x + best.w / 2 - c.x, dy = best.y + best.h / 2 - c.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
    return [P.dirx || P.face, P.diry || 0];
  }
  function shot(x, y, a, w) {
    const big = has('shades');
    shots.push({ x, y, vx: Math.cos(a) * w.sp, vy: Math.sin(a) * w.sp, r: w.r * (big ? 1.4 : 1), dmg: w.dmg + (big ? 1 : 0), col: w.col, life: 0.9, pierce: w.pierce || has('horn'), home: has('wizard'), hits: new Set() });
  }
  function fire() {
    const w = WEAP[G.lv], c = pc(), [ax, ay] = aimDir(), a0 = Math.atan2(ay, ax);
    for (let i = 0; i < w.n; i++) {
      const off = i - (w.n - 1) / 2, a = a0 + off * w.spread;
      const px = w.par ? -Math.sin(a0) * off * w.par : 0, py = w.par ? Math.cos(a0) * off * w.par : 0;
      shot(c.x + Math.cos(a) * 10 + px, c.y - 8 + Math.sin(a) * 10 + py, a, w);
    }
    if (has('hands')) [-0.85, 0.85].forEach((k) => shot(c.x, c.y - 8, a0 + k, w));
    G.cd = w.cd * (has('wand') ? 0.6 : 1);
    SFX.play('pew', G.lv);
  }
  function hurt(m) {
    const c0 = pc();
    if (has('armor') && G.armorT <= 0) { G.armorT = 20; G.inv = 1; SFX.play('bump'); fx.push({ t: 'txt', x: c0.x, y: P.y - 36, s: 'Giáp chặn!', c: '#475569', life: 1 }); fx.push({ t: 'ring', x: c0.x, y: P.y - 8, life: 0.5, c: '#94a3b8' }); return; }
    if (has('shield') && Math.random() < 0.5) { G.inv = 0.8; SFX.play('bump'); fx.push({ t: 'txt', x: c0.x, y: P.y - 36, s: 'Khiên đỡ!', c: '#2563eb', life: 1 }); const d0 = Math.hypot(m.x - c0.x, m.y - c0.y) || 1; moveEnt(m, (m.x - c0.x) / d0 * 30, (m.y - c0.y) / d0 * 30); return; }
    G.lives--; G.inv = 2.2; G.shake = 0.35;
    const lost = G.lv > 0 && !has('helmet'); if (lost) G.lv = 0;
    SFX.play('hurt');
    // bị hất lùi
    const c = pc(), dx = c.x - (m.x + m.w / 2), dy = c.y - (m.y + m.h / 2), d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 10; i++) moveEnt(P, dx / d * 3, dy / d * 3);
    P.target = null;
    fx.push({ t: 'txt', x: c.x, y: P.y - 36, s: lost ? '-1 mạng · mất tiến hoá' : '-1 mạng', c: '#dc2626', life: 1.3 });
    hud();
    if (G.lives <= 0 && has('balloon')) {
      // bóng bay cứu hộ: sống lại 1 lần
      G.lives = 1; G.inv = 3; SFX.play('life');
      hero.gear.balloon = Math.max(0, (hero.gear.balloon || 1) - 1); if (!hero.gear.balloon) { Object.keys(hero.eq).forEach((k) => { if (hero.eq[k] === 'balloon') delete hero.eq[k]; }); }
      saveHero(); hud(); heroPanel();
      fx.push({ t: 'txt', x: c.x, y: P.y - 50, s: 'Bóng bay cứu hộ!', c: '#ef4444', life: 1.4 });
      toast('🎈 Bóng bay cứu hộ kéo Hiyo lên! Còn 1 mạng.');
      return;
    }
    if (G.lives <= 0) gameOver();
    else toast('Bị quái thú bắt! Mất 1 mạng' + (lost ? ' và mất tiến hoá' : '') + '. Hãy bắn trả!');
  }
  function stepAction() {
    const dt = 1 / 60;
    if (G.inv > 0) G.inv -= dt;
    if (G.shake > 0) G.shake -= dt;
    if (G.cd > 0) G.cd -= dt;
    if (G.armorT > 0) G.armorT -= dt;
    if (G.swordT > 0) G.swordT -= dt;
    if (G.fire && G.cd <= 0) fire();
    if (has('halo')) { G.haloT += dt; if (G.haloT >= 60) { G.haloT = 0; if (G.lives < maxLife()) addLife(1, '😇 Vầng hào quang hồi 1 mạng!'); } }
    // đuôi rồng: để lại vệt lửa
    if (has('dragon') && P.walk) { G.trailT -= dt; if (G.trailT <= 0) { G.trailT = 0.12; flames.push({ x: P.x + P.w / 2, y: P.y + P.h - 2, life: 1.4 }); } }
    flames = flames.filter((f) => (f.life -= dt) > 0);
    // đạn bay
    shots = shots.filter((s) => {
      if (s.home) { // đạn đuổi theo quái gần nhất
        let best = null, bd = 220; monsters.forEach((m) => { if (m.dead || s.hits.has(m)) return; const d = Math.hypot(m.x + m.w / 2 - s.x, m.y + m.h / 2 - 6 - s.y); if (d < bd) { bd = d; best = m; } });
        if (best) { const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx), b = Math.atan2(best.y + best.h / 2 - 6 - s.y, best.x + best.w / 2 - s.x); let df = b - a; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; const na = a + Math.max(-0.14, Math.min(0.14, df)); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
      }
      s.x += s.vx; s.y += s.vy; s.life -= dt;
      const tv = tileAt(Math.floor(s.x / T), Math.floor(s.y / T));
      if (tv === 2 || tv === 6 || tv === 7) { fx.push({ t: 'ring', x: s.x, y: s.y, life: 0.25, c: s.col, small: 1 }); return false; }
      for (const m of monsters) {
        if (m.dead || s.hits.has(m)) continue;
        if (Math.abs(s.x - (m.x + m.w / 2)) < m.w / 2 + s.r && Math.abs(s.y - (m.y + m.h / 2 - 6)) < m.h / 2 + 8 + s.r) {
          s.hits.add(m); m.hp -= s.dmg; m.flash = 0.12;
          const d = Math.hypot(s.vx, s.vy) || 1; moveEnt(m, s.vx / d * 6, s.vy / d * 6);
          if (m.hp <= 0) killMonster(m); else SFX.play('mhit');
          if (!s.pierce) return false;
        }
      }
      return s.life > 0;
    });
    // quái thú
    const c = pc();
    monsters.forEach((m) => {
      m.t -= dt; m.ph += 0.15; if (m.flash > 0) m.flash -= dt;
      const mx = m.x + m.w / 2, my = m.y + m.h / 2, dx = c.x - mx, dy = c.y - my, d = Math.hypot(dx, dy);
      const range = (m.bat ? 7 : 5) * T * (has('mask') ? 0.5 : 1);
      if (d < range && G.inv <= 0.6) { m.dx = dx / d; m.dy = dy / d; m.chase = true; }
      else if (m.t <= 0) { const a = Math.random() * Math.PI * 2; m.dx = Math.cos(a); m.dy = Math.sin(a); m.t = 1.2 + Math.random() * 1.8; m.chase = false; }
      const sp = m.sp * (m.chase ? 1 : 0.6) * (has('clock') ? 0.65 : 1) * (has('blush') ? 0.85 : 1);
      if (m.burn > 0) m.burn -= dt;
      if (flames.length && !(m.burn > 0) && flames.some((f) => Math.abs(f.x - mx) < 14 && Math.abs(f.y - (m.y + m.h)) < 12)) { m.burn = 0.5; m.hp -= 1; m.flash = 0.12; if (m.hp <= 0) { killMonster(m); return; } }
      if (has('spike') && d < 22 && !(m.spk > 0)) { m.spk = 0.6; m.hp -= 2; m.flash = 0.12; moveEnt(m, -dx / (d || 1) * 18, -dy / (d || 1) * 18); fx.push({ t: 'ring', x: mx, y: my - 6, life: 0.25, c: '#16a34a', small: 1 }); if (m.hp <= 0) { killMonster(m); return; } }
      if (m.spk > 0) m.spk -= dt;
      if (has('sword') && d < 46 && G.swordT <= 0) { G.swordT = 0.9; fx.push({ t: 'slash', x: c.x, y: c.y - 8, life: 0.3 }); SFX.play('throw'); monsters.forEach((o) => { if (o.dead) return; const dd = Math.hypot(o.x + o.w / 2 - c.x, o.y + o.h / 2 - c.y); if (dd < 52) { o.hp -= 2; o.flash = 0.12; if (o.hp <= 0) killMonster(o); } }); if (m.dead) return; }
      if (moveEnt(m, m.dx * sp, 0) | moveEnt(m, 0, m.dy * sp)) { if (!m.chase) m.t = 0; }
      if (!m.dead && d < 16 && G.inv <= 0) hurt(m);
    });
    monsters = monsters.filter((m) => !m.dead);
    // sinh thêm quái thú
    G.spawnT -= dt;
    const cap2 = Math.min(12, 6 + G.caught);
    if (G.spawnT <= 0) { G.spawnT = 7; if (monsters.length < cap2) spawnMonster(); }
    // nhặt vàng
    const pull = has('magnet') ? 5 * T : has('cat') ? 2 * T : 0;
    golds = golds.filter((g) => {
      const gd = Math.hypot(g.x - c.x, g.y - c.y);
      if (pull && gd < pull && gd > 1) { g.x += (c.x - g.x) / gd * 4.5; g.y += (c.y - g.y) / gd * 4.5; }
      if (gd < 15) {
        const amt = has('crown') ? 2 : 1;
        G.coins += amt; hero.gold += amt; SFX.play('coin');
        fx.push({ t: 'coin', x: g.x, y: g.y, life: 0.5 });
        if (G.coins >= G.nextLife) { G.nextLife += 50; addLife(1, '🎉 Nhặt đủ ' + (G.nextLife - 50) + ' vàng: <b>+1 mạng</b>!'); }
        setTimeout(() => placeGold(), 6000);
        hud(); return false;
      }
      return true;
    });
    // nhặt phụ kiện rơi ra
    drops = drops.filter((g) => { g.life -= dt; if (Math.hypot(g.x - c.x, g.y - 10 - c.y) < 18) { pickGear(g.id); return false; } return g.life > 0; });
    // đá tiến hoá mọc lại
    G.stoneT = G.stoneT.map((v) => v - dt);
    const ready = G.stoneT.filter((v) => v <= 0).length; G.stoneT = G.stoneT.filter((v) => v > 0);
    for (let i = 0; i < ready; i++) placeStone();
  }
  function killMonster(m) {
    m.dead = true; G.kills++;
    SFX.play('mdie');
    const x = m.x + m.w / 2, y = m.y + m.h / 2;
    for (let i = 0; i < 12; i++) fx.push({ t: 'conf', x, y: y - 6, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3, r: 2 + Math.random() * 2.5, c: i % 3 ? '#334155' : '#a78bfa', life: 0.8 });
    const n = (m.bat ? 1 : 2) + (has('bowtie') ? 2 : 0);
    for (let i = 0; i < n; i++) placeGold(x + (i - (n - 1) / 2) * 12, y + 6);
    hero.kills++; saveHero();
    drops.push({ x, y: y - 4, id: GEAR.roll(has('star')), ph: Math.random() * 6, life: 30 });
  }
  function pickGear(id) {
    const g = GEAR.BY[id]; if (!g) return;
    const first = !hero.gear[id];
    hero.gear[id] = (hero.gear[id] || 0) + 1;
    let msg;
    if (!hero.eq[g.slot]) { hero.eq[g.slot] = id; msg = 'Đã đeo <b>' + g.name + '</b>: ' + g.desc; }
    else msg = (first ? 'Phụ kiện mới <b>' + g.name + '</b>' : 'Thêm 1 <b>' + g.name + '</b>') + ' cất vào bộ sưu tập (bấm vào nhân vật để đổi).';
    saveHero();
    SFX.play(g.r >= 3 ? 'evolve' : 'fresh');
    fx.push({ t: 'txt', x: P.x + P.w / 2, y: P.y - 44, s: g.name + (first ? ' ✦' : ''), c: GEAR.RCOL[g.r], life: 1.4 });
    toast((g.r >= 3 ? '🌟 ' : '🎁 ') + msg);
    heroPanel(); hud();
  }
  function gameOver() {
    G.over = true; G.fire = false;
    SFX.play('gameover'); SFX.setDuck(0.4);
    $('hn-got').innerHTML = '<div class="hn-res hn-over-card" style="--c:#dc2626"><div class="hn-res-k"><span>×</span></div>' +
      '<div class="hn-res-body"><div class="hn-res-top"><b>Hiyo bị quái thú bắt mất rồi!</b></div>' +
      '<div>Lượt này: cứu <b>' + G.caught + '</b> chữ · hạ <b>' + G.kills + '</b> quái thú · nhặt <b>' + G.coins + '</b> vàng</div>' +
      '<small>Các chữ đã thu phục vẫn nằm trong hộp sưu tập.</small></div>' +
      '<div class="hn-res-acts"><button class="act-btn primary" id="hn-retry">↺ Chơi lại (3 mạng)</button></div></div>';
    $('hn-got').hidden = false;
    $('hn-retry').onclick = () => {
      $('hn-got').hidden = true;
      Object.assign(G, { lives: 3, coins: 0, lv: 0, inv: 2, cd: 0, over: false, caught: 0, kills: 0, spawnT: 4, nextLife: 50, armorT: 0 }); flames = []; drops = [];
      P.x = start.x; P.y = start.y; P.target = null;
      setupWorld(); newWanted(); hud(); SFX.setDuck(1);
    };
  }
  // --- vẽ ---
  function drawGold(g, t) {
    const b = Math.sin(t * 4 + g.ph) * 2, s = Math.abs(Math.cos(t * 3 + g.ph));
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 8, 6, 2.5, 0, 0, 7); ctx.fill();
    ctx.translate(g.x, g.y - 2 + b); ctx.scale(Math.max(0.2, s), 1);
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
    ctx.restore();
  }
  // trứng tiến hoá: quả trứng cam to, phát sáng, nảy nhẹ
  const EGG_PATH = new Path2D('M0 -17 C9 -17 13 -5 13 4 C13 12 7 17 0 17 C-7 17 -13 12 -13 4 C-13 -5 -9 -17 0 -17 Z');
  function drawStone(x, y, t, broken) {
    const cx = x * T + 16, base = y * T + 28;
    if (broken) {
      ctx.save(); ctx.fillStyle = '#fb923c'; ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.5;
      [[-9, 0.6], [9, -0.6]].forEach(([dx, r]) => { ctx.save(); ctx.translate(cx + dx, base - 6); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-4, -6); ctx.lineTo(0, -2); ctx.lineTo(4, -7); ctx.lineTo(7, 0); ctx.quadraticCurveTo(0, 6, -7, 0); ctx.fill(); ctx.stroke(); ctx.restore(); });
      ctx.restore(); return;
    }
    const bob = Math.sin(t * 3 + x) * 2, cy = base - 17 + bob, pulse = 0.5 + Math.sin(t * 4 + y) * 0.25;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, base, 12 - bob * 0.5, 3.5, 0, 0, 7); ctx.fill();
    const gl = ctx.createRadialGradient(cx, cy, 6, cx, cy, 30); gl.addColorStop(0, 'rgba(251,146,60,' + pulse + ')'); gl.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.fill();
    ctx.translate(cx, cy - 3); ctx.rotate(Math.sin(t * 2 + x) * 0.08); ctx.scale(1.25, 1.25);
    const eg = ctx.createRadialGradient(-4, -7, 2, 0, 0, 20); eg.addColorStop(0, '#ffedd5'); eg.addColorStop(0.35, '#fb923c'); eg.addColorStop(1, '#c2410c');
    ctx.fillStyle = eg; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.fill(EGG_PATH); ctx.stroke(EGG_PATH);
    ctx.fillStyle = '#fed7aa'; [[-6, 7, 2.2], [6, 10, 1.8], [8, -2, 1.5]].forEach(([a, b2, r]) => { ctx.beginPath(); ctx.arc(a, b2, r, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff'; star(0, 1, 7); ctx.fillStyle = '#facc15'; star(0, 1, 4);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-5, -9, 3.5, 2, -0.6, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 + Math.sin(t * 6 + x) * 0.5; star(cx + 13, cy - 14, 3); star(cx - 14, cy - 4, 2); ctx.globalAlpha = 1;
  }
  function drawMonster(m, t) {
    const x = m.x + m.w / 2, y = m.y + m.h;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 11, 3.5, 0, 0, 7); ctx.fill();
    if (m.bat) {
      // dơi mực: bay lơ lửng, đập cánh
      const fy = y - 18 + Math.sin(m.ph * 1.6) * 3, fl = Math.sin(m.ph * 3) * 6;
      ctx.translate(x, fy);
      ctx.fillStyle = m.flash > 0 ? '#fff' : '#312e81';
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-14, -8 - fl, -20, 2 + fl * 0.3); ctx.quadraticCurveTo(-12, 0, -6, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(14, -8 - fl, 20, 2 + fl * 0.3); ctx.quadraticCurveTo(12, 0, 6, 5); ctx.fill();
      ctx.fillStyle = m.flash > 0 ? '#fff' : '#1e1b4b'; ctx.beginPath(); ctx.ellipse(0, 1, 7, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-6, -11); ctx.lineTo(-2, -6); ctx.moveTo(5, -5); ctx.lineTo(6, -11); ctx.lineTo(2, -6); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(-3, 0, 1.8, 0, 7); ctx.arc(3, 0, 1.8, 0, 7); ctx.fill();
    } else {
      // yêu quái mực: giọt mực có 2 sừng
      const w = Math.sin(m.ph) * 1.5;
      ctx.translate(x, y);
      ctx.fillStyle = m.flash > 0 ? '#fff' : '#1e293b';
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-14, -13 - w, -6, -20); ctx.quadraticCurveTo(0, -24, 6, -20); ctx.quadraticCurveTo(14, -13 + w, 12, 0);
      ctx.quadraticCurveTo(8, -3, 4, 0); ctx.quadraticCurveTo(0, -3, -4, 0); ctx.quadraticCurveTo(-8, -3, -12, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -18); ctx.lineTo(-9, -26); ctx.lineTo(-3, -21); ctx.moveTo(7, -18); ctx.lineTo(9, -26); ctx.lineTo(3, -21); ctx.fill();
      const ex = Math.max(-2, Math.min(2, m.dx * 2));
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-4 + ex, -12, 3.5, 4.5, 0, 0, 7); ctx.ellipse(4 + ex, -12, 3.5, 4.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = m.chase ? '#dc2626' : '#475569'; ctx.beginPath(); ctx.arc(-4 + ex * 1.4, -11, 1.8, 0, 7); ctx.arc(4 + ex * 1.4, -11, 1.8, 0, 7); ctx.fill();
      if (m.max > 1 && m.hp < m.max) { ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-10, -32, 20, 3); ctx.fillStyle = '#ef4444'; ctx.fillRect(-10, -32, 20 * m.hp / m.max, 3); }
    }
    ctx.restore();
  }
  function drawShot(s) {
    ctx.save(); ctx.shadowColor = s.col; ctx.shadowBlur = 10;
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.45, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---------- Điều khiển ----------
  const key = { l: false, r: false, u: false, d: false };
  const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
  document.addEventListener('keydown', (e) => {
    if (enc && enc.q && /^[1-4]$/.test(e.key)) { pickOpt(Number(e.key) - 1); e.preventDefault(); return; }
    if (KEYMAP[e.key] && running && !enc) { key[KEYMAP[e.key]] = true; P.target = null; e.preventDefault(); }
    if ((e.key === ' ' || e.key === 'j' || e.key === 'J') && running && !enc && !cap) { G.fire = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) key[KEYMAP[e.key]] = false; if (e.key === ' ' || e.key === 'j' || e.key === 'J') G.fire = false; });
  { const fb = $('hn-fire'); const on = (e) => { e.preventDefault(); G.fire = true; fb.classList.add('on'); SFX.init(); }; const off = (e) => { e.preventDefault(); G.fire = false; fb.classList.remove('on'); };
    fb.addEventListener('pointerdown', on); fb.addEventListener('pointerup', off); fb.addEventListener('pointerleave', off); fb.addEventListener('pointercancel', off); }
  document.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); key[k] = true; P.target = null; b.classList.add('on'); };
    const off = (e) => { e.preventDefault(); key[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  // chạm vào bản đồ để đi tới đó
  const cv = $('hn-canvas'), ctx = cv.getContext('2d');
  cv.addEventListener('pointerdown', (e) => {
    if (!running || enc || cap) return;
    const r = cv.getBoundingClientRect();
    P.target = { x: (e.clientX - r.left) / (scale * zoom) + cam.x, y: (e.clientY - r.top) / (scale * zoom) + cam.y };
    fx.push({ t: 'tap', x: P.target.x, y: P.target.y, life: 0.5 });
  });

  // ---------- Canvas ----------
  let scale = 1, VW = 600, VH = 400, dpr = 1, zoom = 1;
  const vw = () => VW / zoom, vh = () => VH / zoom;
  function resize() {
    const box = $('hn-stage').getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    scale = Math.max(1, box.height / (11 * T)); VW = box.width / scale; VH = box.height / scale;
    cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
    cv.style.width = box.width + 'px'; cv.style.height = box.height + 'px';
  }
  window.addEventListener('resize', resize);

  // ---------- Cập nhật ----------
  // ô chặn đường riêng cho Hiyo: có cánh thì bay qua cây/đá/nước, có chân vịt thì bơi qua nước
  function pSolid(px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (x <= 0 || y <= 0 || x >= MW - 1 || y >= MH - 1) return true;
    const v = map[y][x];
    if (v === 7 || v === 8) return true;
    if (has('wings')) return false;
    if (v === 3 && has('flipper')) return false;
    return SOLID.has(v);
  }
  function speedMul() {
    let k = 1 + (has('boots') ? 0.35 : 0) + (has('cape') ? 0.2 : 0) + (has('jet') ? 0.45 : 0) + (has('wings') ? 0.1 : 0);
    if (has('skates') && tileAt(Math.floor((P.x + P.w / 2) / T), Math.floor((P.y + P.h - 2) / T)) === 4) k += 0.7;
    return k;
  }
  function move(dx, dy) {
    const L = P.x, R = P.x + P.w - 1, U = P.y, D = P.y + P.h - 1;
    if (dx) { const nx = dx > 0 ? R + dx : L + dx; if (!pSolid(nx, U) && !pSolid(nx, D)) P.x += dx; else if (P.target) P.target.blockX = true; }
    if (dy) { const ny = dy > 0 ? D + dy : U + dy; if (!pSolid(L, ny) && !pSolid(R, ny)) P.y += dy; else if (P.target) P.target.blockY = true; }
  }
  function step() {
    let dx = (key.r ? 1 : 0) - (key.l ? 1 : 0), dy = (key.d ? 1 : 0) - (key.u ? 1 : 0);
    if (!dx && !dy && P.target) {
      const tx = P.target.x - (P.x + P.w / 2), ty = P.target.y - (P.y + P.h / 2), d = Math.hypot(tx, ty);
      if (d < 4) P.target = null; else { dx = tx / d; dy = ty / d; }
    }
    const len = Math.hypot(dx, dy);
    if (len) {
      const spd = SPEED * speedMul();
      dx = dx / len * spd; dy = dy / len * spd;
      const x0 = P.x, y0 = P.y;
      move(dx, 0); move(0, dy);
      if (P.target && P.x === x0 && P.y === y0) P.target = null; // bị chặn hẳn thì dừng
      if (dx) P.face = dx > 0 ? 1 : -1;
      P.dirx = dx / spd; P.diry = dy / spd;
      { const c = pc(), ax = c.x + Math.sign(Math.round(P.dirx * 2)) * 14, ay = c.y + Math.sign(Math.round(P.diry * 2)) * 11; const tx = Math.floor(ax / T), ty = Math.floor(ay / T); if (tileAt(tx, ty) === 7) bumpStone(tx, ty); }
      P.walk += 0.25;
      if ((P.stepT = (P.stepT || 0) - 1 / 60) <= 0) { P.stepT = tileAt(Math.floor((P.x + P.w / 2) / T), Math.floor((P.y + P.h) / T)) === 1 ? 0.22 : 0.3; SFX.play('step'); }
    } else P.walk = 0;
    fx = fx.filter((f) => (f.life -= 1 / 60) > 0);
    stepAction();
    if (G.over) return;
    // gặp cầu chữ
    for (const o of orbs) { if (o.cool > 0) o.cool -= 1 / 60; else if (dist(o) < 20) { if (o.target) encounter(o); else decoy(o); break; } }
    cam.x += (Math.max(0, Math.min(MW * T - vw(), P.x + P.w / 2 - vw() / 2)) - cam.x) * 0.2;
    cam.y += (Math.max(0, Math.min(MH * T - vh(), P.y + P.h / 2 - vh() / 2)) - cam.y) * 0.2;
    radar();
  }
  const dist = (o) => { const p = orbPos(o); return Math.hypot(p.x - (P.x + P.w / 2), p.y - (P.y + P.h / 2)); };
  let lastRadar = -1, pingT = 0;
  function radar() {
    const d = orbs.length ? Math.min(...orbs.map(dist)) / T : 99;
    const lvl = d < 3 ? 3 : d < 6 ? 2 : d < 10 ? 1 : 0;
    const t = $('hn-rtxt');
    t.textContent = ['Lạnh', 'Hơi ấm', 'Ấm', 'Nóng!'][lvl] + (d < 99 ? ' · ' + Math.round(d) + ' ô' : '');
    if (lvl !== lastRadar) { lastRadar = lvl; t.className = 'hn-heat h' + lvl; }
    pingT -= 1 / 60;
    if (lvl > 0 && pingT <= 0) { pingT = [0, 1.6, 1.0, 0.5][lvl]; SFX.play('ping', lvl); }
  }

  // ---------- Vẽ ----------
  const HIMG = {};
  function himg(mood, form) {
    form = form == null ? currentForm() : form;
    const k = form + mood; if (HIMG[k]) return HIMG[k];
    const svg = HIYO.svg(form, mood, { cls: 'x' }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return (HIMG[k] = im);
  }
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) & 1023;
  function draw() {
    const t = performance.now() / 1000;
    ctx.setTransform(dpr * scale * zoom, 0, 0, dpr * scale * zoom, 0, 0);
    ctx.fillStyle = '#86c46a'; ctx.fillRect(0, 0, vw(), vh());
    const sh = G.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
    ctx.save(); ctx.translate(-Math.round(cam.x) + sh, -Math.round(cam.y));
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(MW - 1, Math.ceil((cam.x + vw()) / T));
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(MH - 1, Math.ceil((cam.y + vh()) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ground(map[y][x], x, y, t);
    // bụi cỏ cao + cây vẽ theo hàng để Hiyo đứng đúng lớp
    const prow = Math.floor((P.y + P.h) / T);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { const v = map[y][x]; if (v === 1) tall(x, y, t, false); else if (v === 2) tree(x, y); else if (v === 6) rock(x, y); else if (v === 7 || v === 8) drawStone(x, y, t, v === 8); }
      golds.forEach((g) => { if (Math.floor(g.y / T) === y) drawGold(g, t); });
      orbs.forEach((o) => { if (o.ty === y) orbSprite(o, t); });
      monsters.forEach((m) => { if (Math.floor((m.y + m.h) / T) === y) drawMonster(m, t); });
      if (y === prow) hiyo(t);
    }
    if (prow > y1 || prow < y0) hiyo(t);
    flames.forEach((f) => { const k = f.life / 1.4; ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); const g = ctx.createRadialGradient(f.x, f.y - 4, 1, f.x, f.y - 4, 10 * k + 3); g.addColorStop(0, '#fde047'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, 'rgba(220,38,38,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y - 4, 10 * k + 3, 0, 7); ctx.fill(); ctx.restore(); });
    drops.forEach((g) => { const b = Math.sin(t * 4 + g.ph) * 3, gr = GEAR.BY[g.id]; ctx.save(); if (g.life < 5 && Math.floor(t * 8) % 2) ctx.globalAlpha = 0.4; const gl = ctx.createRadialGradient(g.x, g.y - 10 + b, 2, g.x, g.y - 10 + b, 22); gl.addColorStop(0, GEAR.RCOL[gr.r]); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(g.x, g.y - 10 + b, 22, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = GEAR.RCOL[gr.r]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y - 10 + b, 12, 0, 7); ctx.fill(); ctx.stroke(); ctx.translate(g.x, g.y - 10 + b); GEAR.drawIcon(ctx, g.id, 18, t); ctx.restore(); });
    shots.forEach(drawShot);
    fx.forEach((f) => {
      if (f.t === 'conf') { f.x += f.vx; f.y += f.vy; f.vy += 0.12; ctx.save(); ctx.globalAlpha = Math.min(1, f.life * 1.5); ctx.translate(f.x, f.y); ctx.rotate(f.life * 8); ctx.fillStyle = f.c; star(0, 0, f.r); ctx.restore(); }
      else if (f.t === 'tick') { ctx.save(); ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = '#facc15'; ctx.translate(f.x, f.y - (0.6 - f.life) * 30); star(0, 0, 6); ctx.restore(); }
      else if (f.t === 'txt') { ctx.save(); const k = 1 - f.life; ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = '900 15px "Zen Maru Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(f.s, f.x, f.y - k * 24); ctx.fillStyle = f.c; ctx.fillText(f.s, f.x, f.y - k * 24); ctx.restore(); }
      else if (f.t === 'ring') { const k = f.small ? 1 - f.life / 0.25 : 1 - f.life / 0.8; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.c; ctx.lineWidth = f.small ? 2 : 4; ctx.beginPath(); ctx.arc(f.x, f.y, (f.small ? 4 : 10) + k * (f.small ? 10 : 50), 0, 7); ctx.stroke(); ctx.restore(); }
      else if (f.t === 'coin') { const k = 1 - f.life / 0.5; ctx.save(); ctx.globalAlpha = 1 - k; drawGold({ x: f.x, y: f.y - k * 26, ph: 0 }, k * 20); ctx.restore(); }
      else if (f.t === 'slash') { const k = 1 - f.life / 0.3; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 5; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(f.x, f.y, 30 + k * 18, k * 6, k * 6 + 4.2); ctx.stroke(); ctx.restore(); }
      else if (f.t === 'tap') { ctx.globalAlpha = f.life * 2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 14 - f.life * 16, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    });
    if (cap) drawCapture();
    ctx.restore();
    drawRadar(t);
  }
  // viên ngọc nằm trên bãi cỏ: thấy rõ, nảy nhẹ, có quầng sáng theo độ hiếm
  function orbSprite(o, t) {
    const p = orbPos(o), c = o.shiny ? 'hsl(' + ((t * 120) % 360) + ',85%,60%)' : RAR[o.rar].color;
    const bob = Math.sin(t * 3 + o.tx) * 3, y = p.y - 8 + bob, r = 12;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 10 - bob * 0.6, 3.5, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(p.x, y, 4, p.x, y, 26); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.45 + Math.sin(t * 4 + o.ty) * 0.15; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, 26, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    const b = ctx.createRadialGradient(p.x - 4, y - 5, 1, p.x, y, r); b.addColorStop(0, '#fff'); b.addColorStop(0.45, 'rgba(255,255,255,.85)'); b.addColorStop(1, c);
    ctx.fillStyle = b; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c1917'; ctx.font = '600 14px "Klee One", "Hiragino Mincho ProN", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.ch, p.x, y + 1);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(p.x - 5, y - 6, 3.5, 2, -0.6, 0, 7); ctx.fill();
    ctx.restore();
  }
  // ra-đa tròn ở góc trên bên phải: chấm màu là cầu chữ, mũi tên ở mép là cầu ngoài tầm
  let RANGE = 15 * T;
  function drawRadar(t) {
    RANGE = 15 * T * (has('goggles') ? 2 : 1);
    const sw = VW * scale, R = Math.max(42, Math.min(64, sw * 0.12)), cx = sw - R - 12, cy = R + 12;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(6, 46, 30, .82)'; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(74, 222, 128, .35)'; ctx.lineWidth = 1;
    [R / 3, R * 2 / 3].forEach((rr) => { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    // tia quét
    const ang = (t * 2.2) % (Math.PI * 2);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(74, 222, 128, ' + (0.28 * (1 - i / 14)).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, ang - (i + 1) * 0.06, ang - i * 0.06); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); ctx.stroke();
    const px = P.x + P.w / 2, py = P.y + P.h / 2;
    orbs.forEach((o) => {
      const p = orbPos(o), dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const col = o.target ? '#facc15' : 'rgba(203,213,225,.7)';
      let diff = (ang - a) % (Math.PI * 2); if (diff < 0) diff += Math.PI * 2;
      const glow = Math.max(0.35, 1 - diff / 2.5);
      ctx.globalAlpha = glow;
      if (d <= RANGE) {
        const k = d / RANGE * R, bx = cx + Math.cos(a) * k, by = cy + Math.sin(a) * k;
        if (o.target) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(250,204,21,.35)'; ctx.beginPath(); ctx.arc(bx, by, 10 + Math.sin(t * 6) * 2.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, o.target ? 6.5 : 3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      } else {
        const bx = cx + Math.cos(a) * (R - 6), by = cy + Math.sin(a) * (R - 6);
        if (!o.target) return;
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(bx, by); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6.5); ctx.lineTo(-5, 6.5); ctx.fill(); ctx.restore();
      }
    });
    ctx.globalAlpha = 1;
    if (has('lantern')) monsters.forEach((m) => { const dx = m.x + m.w / 2 - px, dy = m.y + m.h / 2 - py, d = Math.hypot(dx, dy); if (d > RANGE) return; const k = d / RANGE * R; ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + dx / (d || 1) * k, cy + dy / (d || 1) * k, 2.4, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#422006'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#bbf7d0'; ctx.font = '800 10px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RA-ĐA', cx, cy + R + 14);
    ctx.restore();
  }
  function star(x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
  function ground(v, x, y, t) {
    const X = x * T, Y = y * T, h = hash(x, y);
    if (v === 3) {
      ctx.fillStyle = '#4fa8d8'; ctx.fillRect(X, Y, T, T);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); const o = Math.sin(t * 2 + x + y) * 3; ctx.moveTo(X + 5 + o, Y + 12); ctx.quadraticCurveTo(X + 10 + o, Y + 9, X + 15 + o, Y + 12); ctx.moveTo(X + 16 - o, Y + 23); ctx.quadraticCurveTo(X + 21 - o, Y + 20, X + 26 - o, Y + 23); ctx.stroke();
      return;
    }
    ctx.fillStyle = v === 4 ? '#e2c58f' : (x + y) % 2 ? '#8bc96e' : '#86c46a'; ctx.fillRect(X, Y, T, T);
    if (v === 4) { ctx.fillStyle = '#d4b277'; if (h & 1) ctx.fillRect(X + (h % 20) + 4, Y + 8, 3, 3); if (h & 2) ctx.fillRect(X + 6, Y + (h % 18) + 6, 2, 2); }
    else { ctx.fillStyle = '#6fb257'; if (h & 4) { ctx.fillRect(X + (h % 24) + 3, Y + 6, 2, 5); ctx.fillRect(X + (h % 24) + 6, Y + 8, 2, 3); } }
    if (v === 5) { const cs = ['#fff', '#fde047', '#f9a8d4']; for (let i = 0; i < 3; i++) { ctx.fillStyle = cs[(h + i) % 3]; ctx.beginPath(); ctx.arc(X + 6 + ((h >> i) % 20), Y + 8 + ((h >> (i + 2)) % 18), 2.6, 0, 7); ctx.fill(); } }
  }
  function tall(x, y, t, front) {
    const X = x * T, Y = y * T;
    const near = orbs.some((o) => o.tx === x && o.ty === y);
    const sway = Math.sin(t * (near ? 9 : 2) + x * 0.7 + y) * (near ? 3.5 : 1.5);
    ctx.fillStyle = '#4f9a3c'; ctx.fillRect(X, Y + 18, T, 14);
    for (let i = 0; i < 5; i++) {
      const bx = X + 2 + i * 7, top = Y + 2 + ((i * 7 + x) % 5);
      ctx.fillStyle = i % 2 ? '#3f8a2f' : '#5bb045';
      ctx.beginPath(); ctx.moveTo(bx - 1, Y + 32); ctx.lineTo(bx + sway, top); ctx.lineTo(bx + 7, Y + 32); ctx.fill();
    }
  }
  function tree(x, y) {
    const X = x * T, Y = y * T;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 28, 14, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7c4a1e'; ctx.fillRect(X + 13, Y + 16, 6, 13);
    ctx.fillStyle = '#2f7d32'; ctx.beginPath(); ctx.arc(X + 16, Y + 10, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(X + 12, Y + 6, 8, 0, 7); ctx.fill();
  }
  function rock(x, y) {
    const X = x * T, Y = y * T;
    ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.ellipse(X + 16, Y + 20, 13, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.ellipse(X + 12, Y + 16, 5, 3, -0.4, 0, 7); ctx.fill();
  }
  function hiyo(t) {
    if (G.inv > 0 && Math.floor(G.inv * 12) % 2) return;
    const im = himg(G.inv > 1.2 ? 'sad' : 'happy', FORM_OF[G.lv]);
    const cx = P.x + P.w / 2, by = P.y + P.h;
    const bob = P.walk ? Math.abs(Math.sin(P.walk)) * 3 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, by, 12, 4, 0, 0, 7); ctx.fill();
    const sz = 38 + G.lv * 3;
    if (G.lv) { ctx.save(); ctx.translate(cx, by - bob); ctx.globalAlpha = 0.35 + Math.sin(t * 5) * 0.15; ctx.fillStyle = WEAP[G.lv].col; ctx.beginPath(); ctx.ellipse(0, -sz / 2 + 2, sz / 2 + 4, sz / 2 + 2, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (has('armor') && G.armorT <= 0) { ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(cx, by - bob - sz / 2, sz / 2 + 6, 0, 7); ctx.stroke(); ctx.restore(); }
    GEAR.drawHero(ctx, im, cx, by - bob, sz, hero.eq, t, P.face);
    // đứng trong bụi cỏ cao thì cỏ che phần chân
    const tx = Math.floor(cx / T), ty = Math.floor((by - 2) / T);
    if (tileAt(tx, ty) === 1) { ctx.save(); ctx.beginPath(); ctx.rect(tx * T - T, ty * T + 20, T * 3, 12); ctx.clip(); tall(tx, ty, t, true); if (tileAt(tx - 1, ty) === 1) tall(tx - 1, ty, t, true); if (tileAt(tx + 1, ty) === 1) tall(tx + 1, ty, t, true); ctx.restore(); }
  }

  // ---------- Cách đọc ----------
  const kata2hira = (s) => String(s || '').replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const isKanji = (ch) => /[一-鿿々]/.test(ch);
  const DICT = window.SUMI_DICT || {};
  function readingsOf(c) {
    const d = data[c], out = new Set();
    let on = d ? [].concat(d.on || []) : String((DICT[c] || [])[0] || '').split('・');
    let kun = d ? [].concat(d.kun || []) : String((DICT[c] || [])[1] || '').split('・');
    on.forEach((r) => { r = kata2hira(r.replace(/[-.]/g, '')); if (r) out.add(r); });
    kun.forEach((r) => { const b = r.split('.')[0].replace(/-/g, ''); if (b) out.add(b); const full = r.replace(/[-.]/g, ''); if (full && full !== b) out.add(full); });
    return [...out];
  }
  const VOICE = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
  const HANDAKU = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
  function variants(r) {
    const v = new Set([r]);
    if (VOICE[r[0]]) v.add(VOICE[r[0]] + r.slice(1));
    if (HANDAKU[r[0]]) v.add(HANDAKU[r[0]] + r.slice(1));
    [...v].forEach((x) => { if (/[つくちき]$/.test(x) && x.length > 1) v.add(x.slice(0, -1) + 'っ'); });
    return [...v];
  }
  // tách cách đọc của từng chữ trong từ, ví dụ 学校/がっこう → 学=がっ, 校=こう
  function segReading(word, reading, c) {
    const W = [...word], R = kata2hira(reading), ti = W.indexOf(c);
    if (ti < 0) return null;
    const sols = new Set();
    (function go(i, p, got) {
      if (sols.size > 3) return;
      if (i === W.length) { if (p === R.length && got) sols.add(got); return; }
      const ch = W[i];
      if (!isKanji(ch)) { const k = kata2hira(ch); if (R.startsWith(k, p)) go(i + 1, p + k.length, got); return; }
      const cand = new Set(); readingsOf(ch).forEach((r) => variants(r).forEach((x) => cand.add(x)));
      if (ch === '々' && i > 0) readingsOf(W[i - 1]).forEach((r) => variants(r).forEach((x) => cand.add(x)));
      cand.forEach((x) => { if (x && R.startsWith(x, p)) go(i + 1, p + x.length, i === ti ? x : got); });
    })(0, 0, null);
    return sols.size === 1 ? [...sols][0] : null;
  }

  // ---------- Câu hỏi: nghĩa · cách đọc trong từ · cách đọc trong câu ví dụ ----------
  function uniq4(right, pool) { const o = [right]; for (const x of shuffle(pool)) { if (o.length >= 4) break; if (x && !o.includes(x)) o.push(x); } return shuffle(o); }
  function readingPool(c, right, len) {
    const near = new Set(variants(right)); readingsOf(c).forEach((r) => { if (variants(r).includes(right)) near.add(r); });
    const own = shuffle(readingsOf(c).filter((x) => !near.has(x) && !variants(x).includes(right))).slice(0, 2);
    const pool = [];
    chars.forEach((x) => { if (x === c) return; readingsOf(x).forEach((r) => { if (Math.abs(r.length - len) <= 1) pool.push(r); }); ((data[x] || {}).w || []).forEach((v) => { const r = kata2hira(v[1] || ''); if (r && Math.abs(r.length - len) <= 1) pool.push(r); }); });
    const o = [right]; own.forEach((x) => { if (!o.includes(x)) o.push(x); });
    for (const x of shuffle(pool)) { if (o.length >= 4) break; if (x && !o.includes(x)) o.push(x); }
    return shuffle(o);
  }
  const wordHl = (w, c) => [...w].map((ch) => (ch === c ? '<em class="hl">' + ch + '</em>' : esc(ch))).join('');
  function qMean(c) {
    const others = chars.filter((x) => x !== c && viOf(x) !== viOf(c));
    return { tag: 'Nghĩa', ask: 'Chữ <b class="w">' + c + '</b> nghĩa là gì?', right: viOf(c), opts: uniq4(viOf(c), others.map(viOf)),
      fb: '<b class="jp">' + c + '</b> ' + esc(hvOf(c)) + ' · ' + esc(IDX[c] ? IDX[c][1] : viOf(c)) };
  }
  function qWord(c) {
    const words = ((data[c] || {}).w || []).filter((w) => w[0].includes(c) && w[1] && w[0].length > 1);
    const list = shuffle(words.length ? words : ((data[c] || {}).w || []).filter((w) => w[0].includes(c) && w[1]));
    for (const w of list) {
      const seg = segReading(w[0], w[1], c);
      if (seg) return { tag: 'Đọc trong từ', ask: 'Trong từ <b class="w">' + wordHl(w[0], c) + '</b>, chữ <b class="w hl2">' + c + '</b> đọc là gì?<small>' + esc(w[3] || '') + '</small>', right: seg, opts: readingPool(c, seg, seg.length), cls: 'jp',
        fb: '<b class="jp">' + esc(w[0]) + '</b> <span class="jp">' + esc(w[1]) + '</span> · ' + esc(w[3] || '') };
    }
    const w = list[0]; if (!w) return null;
    const r = kata2hira(w[1]);
    return { tag: 'Đọc từ', ask: 'Từ <b class="w">' + wordHl(w[0], c) + '</b> đọc là gì?<small>' + esc(w[3] || '') + '</small>', right: r, opts: readingPool(c, r, r.length), cls: 'jp',
      fb: '<b class="jp">' + esc(w[0]) + '</b> <span class="jp">' + esc(w[1]) + '</span> · ' + esc(w[3] || '') };
  }
  function qSentence(c) {
    const sns = shuffle(((data[c] || {}).sn || []).filter((s) => s[0].some((g) => Array.isArray(g) && g[0].includes(c))));
    const s = sns[0]; if (!s) return null;
    const ti = s[0].findIndex((g) => Array.isArray(g) && g[0].includes(c));
    const tgt = s[0][ti], right = kata2hira(tgt[1]);
    const html = s[0].map((g, i) => (typeof g === 'string' ? esc(g) : i === ti ? '<em class="hl">' + esc(g[0]) + '</em>' : '<ruby>' + esc(g[0]) + '<rt>' + esc(g[1]) + '</rt></ruby>')).join('');
    return { tag: 'Đọc trong câu', ask: 'Từ tô màu trong câu đọc là gì?<div class="hn-sent jp">' + html + '</div>', right, opts: readingPool(c, right, right.length), cls: 'jp',
      fb: '<span class="jp">' + s[0].map((g) => (typeof g === 'string' ? esc(g) : esc(g[0]))).join('') + '</span><br>' + esc(s[1] || '') };
  }
  function makeQ(c, k) {
    if (k === 0) return qMean(c);
    if (k === 1) return qWord(c) || qMean(c);
    return qSentence(c) || qWord(c) || qMean(c);
  }

  // ---------- Gặp cầu chữ: bảng câu hỏi ----------
  // ---------- Ôn tập mỗi ngày: trả lời sai thì chữ trốn khỏi hộp, level giảm ----------
  const levelData = {};
  function startReview() {
    if (enc || cap) return;
    const list = shuffle(dueList()).slice(0, 30);
    if (!list.length) { toast('Hôm nay không có chữ nào cần ôn. Giỏi lắm!'); return; }
    $('hn-heropage').hidden = true;
    const lvs = [...new Set(list.map((x) => x.lv))].filter((l) => LEVELS[l]);
    toast('Đang chuẩn bị bài ôn…');
    Promise.all(lvs.map((l) => (levelData[l] ? Promise.resolve(levelData[l]) : sumiLoadLevel(l).then((d) => (levelData[l] = d))))).then(() => {
      key.l = key.r = key.u = key.d = false; P.target = null; G.fire = false;
      enc = { review: true, list: list.filter((x) => LEVELS[x.lv] && levelData[x.lv][x.c]), i: 0, kept: 0, lost: 0, keep: { data, chars }, lock: false };
      if (!enc.list.length) { enc = null; return; }
      $('hn-enc').hidden = false; SFX.play('encounter'); SFX.setDuck(0.45);
      nextReview();
    });
  }
  function nextReview() {
    const r = enc, it = r.list[r.i];
    data = levelData[it.lv]; chars = levelChars(it.lv).filter((c) => IDX[c] && data[c]);
    const q = makeQ(it.c, Math.floor(Math.random() * 3));
    r.q = q; r.lock = false; r.o = { ch: it.c };
    $('hn-qk').textContent = it.c; $('hn-qk').style.setProperty('--c', '#f97316'); $('hn-qk').className = 'hn-qk';
    $('hn-rar').textContent = 'Ôn tập hôm nay'; $('hn-rar').className = 'hn-rar r4';
    $('hn-seals').innerHTML = '';
    $('hn-qtag').innerHTML = 'Chữ ' + (r.i + 1) + '/' + r.list.length + ' · ' + q.tag + ' · sai thì chữ trốn khỏi hộp';
    $('hn-ask').innerHTML = q.ask;
    $('hn-fb').className = 'hn-fb'; $('hn-fb').innerHTML = '';
    $('hn-opts').className = 'hn-opts ' + (q.cls || '');
    $('hn-opts').innerHTML = q.opts.map((t, i) => '<button class="hn-opt" data-i="' + i + '"><span>' + (i + 1) + '</span>' + esc(t) + '</button>').join('');
  }
  function answerReview(i) {
    const r = enc, q = r.q, it = r.list[r.i], ok = q.opts[i] === q.right;
    r.lock = true;
    document.querySelectorAll('.hn-opt').forEach((x) => { x.disabled = true; const v = q.opts[Number(x.dataset.i)]; if (v === q.right) x.classList.add('right'); else if (Number(x.dataset.i) === i) x.classList.add('wrong'); });
    const all = store.get(SAVE, {}), b = all[it.lv] || {}, e = b[it.c];
    if (ok) {
      if (e) { e.iv = Math.min(60, (e.iv || 1) * 2); e.due = addDay(today(), e.iv); }
      r.kept++; SFX.play('right', 2); fxBurst();
      $('hn-fb').innerHTML = '✓ Giữ được chữ! Hẹn ôn lại sau ' + (e ? e.iv : 1) + ' ngày.<br>' + q.fb;
    } else {
      delete b[it.c]; r.lost++; SFX.play('flee');
      $('hn-qk').classList.add('flee');
      $('hn-fb').innerHTML = '✕ Đáp án: <b class="jp">' + esc(q.right) + '</b> · Chữ <b>' + it.c + '</b> đã trốn khỏi hộp! Level −1<br>' + q.fb;
    }
    all[it.lv] = b; store.set(SAVE, all);
    $('hn-fb').className = 'hn-fb show ' + (ok ? 'ok' : 'bad');
    heroPanel();
    setTimeout(() => { r.i++; if (r.i < r.list.length) nextReview(); else endReview(); }, ok ? 1500 : 2600);
  }
  function endReview() {
    const r = enc; data = r.keep.data; chars = r.keep.chars; enc = null;
    $('hn-enc').hidden = true; SFX.setDuck(1);
    if (r.kept + r.lost) SFX.play(r.lost ? 'tick' : 'success');
    $('hn-got').innerHTML = '<div class="hn-res" style="--c:#f97316"><div class="hn-res-k"><span>復</span></div><div class="hn-res-body"><div class="hn-res-top"><b>Ôn tập xong!</b></div>' +
      '<div>Giữ được <b>' + r.kept + '</b> chữ' + (r.lost ? ' · <b style="color:#dc2626">' + r.lost + '</b> chữ trốn khỏi hộp' : '') + '</div>' +
      '<div>Level nhân vật: <b>' + heroLevel() + '</b> / ' + LV_MAX + '</div>' + (r.lost ? '<small>Các chữ đã trốn quay lại bãi cỏ, hãy săn lại nhé!</small>' : '<small>Tuyệt vời, không mất chữ nào!</small>') + '</div>' +
      '<div class="hn-res-acts"><button class="act-btn primary" id="hn-cont">Tiếp tục săn</button></div></div>';
    $('hn-got').hidden = false; $('hn-cont').onclick = () => { $('hn-got').hidden = true; };
    hud(); heroPanel();
  }

  function encounter(o) {
    key.l = key.r = key.u = key.d = false; P.target = null; G.fire = false;
    const col = o.shiny ? '#ec4899' : RAR[o.rar].color;
    enc = { o, k: 0, miss: 0, q: null, lock: false, col };
    $('hn-qk').textContent = o.ch; $('hn-qk').style.setProperty('--c', col);
    $('hn-qk').className = 'hn-qk' + (o.shiny ? ' shiny' : '');
    $('hn-rar').textContent = (o.shiny ? '✦ Lấp lánh · ' : '') + RAR[o.rar].name + (book()[o.ch] ? ' · đã có trong hộp' : ' · chữ mới!');
    $('hn-rar').className = 'hn-rar ' + (o.shiny ? 'r4' : 'r' + o.rar);
    $('hn-enc').hidden = false;
    SFX.play('encounter'); SFX.setDuck(0.45);
    nextQ();
  }
  function fxBurst() { const q = $('hn-qk'); q.classList.remove('hit'); void q.offsetWidth; q.classList.add('hit'); }
  function seals() { $('hn-seals').innerHTML = [0, 1, 2].map((i) => '<i class="' + (i < enc.k ? 'ok' : i === enc.k ? 'now' : '') + '"></i>').join(''); }
  function nextQ() {
    const q = makeQ(enc.o.ch, enc.k);
    enc.q = q; enc.lock = false;
    seals();
    $('hn-qtag').innerHTML = 'Câu ' + (enc.k + 1) + '/3 · ' + q.tag;
    $('hn-ask').innerHTML = q.ask;
    $('hn-fb').className = 'hn-fb'; $('hn-fb').innerHTML = '';
    $('hn-opts').className = 'hn-opts ' + (q.cls || '');
    $('hn-opts').innerHTML = q.opts.map((t, i) => '<button class="hn-opt" data-i="' + i + '"><span>' + (i + 1) + '</span>' + esc(t) + '</button>').join('');
  }
  $('hn-opts').addEventListener('click', (e) => { const b = e.target.closest('.hn-opt'); if (b) pickOpt(Number(b.dataset.i)); });
  function pickOpt(i) {
    if (!enc || !enc.q || enc.lock) return;
    if (enc.review) { answerReview(i); return; }
    const q = enc.q, ok = q.opts[i] === q.right;
    enc.lock = true;
    document.querySelectorAll('.hn-opt').forEach((x) => { x.disabled = true; const v = q.opts[Number(x.dataset.i)]; if (v === q.right) x.classList.add('right'); else if (Number(x.dataset.i) === i) x.classList.add('wrong'); });
    $('hn-fb').innerHTML = (ok ? '✓ ' : '✕ Đáp án: <b class="jp">' + esc(q.right) + '</b> · mất 1 sao thưởng, thử câu khác cùng loại<br>') + q.fb;
    $('hn-fb').className = 'hn-fb show ' + (ok ? 'ok' : 'bad');
    if (ok) {
      enc.k++; SFX.play('right', enc.k); fxBurst(); seals();
      if (enc.k >= 3) { setTimeout(startCapture, 1300); return; }
      setTimeout(nextQ, 1400);
    } else {
      // sai: mất 1 sao truy nã và hỏi lại câu khác cùng loại
      enc.miss++; if (wanted) { wanted.miss++; poster(); }
      SFX.play('wrong');
      setTimeout(nextQ, 2400);
    }
  }
  $('hn-run').onclick = () => { if (!enc || enc.lock) return; if (enc.review) { endReview(); return; } const o = enc.o; $('hn-enc').hidden = true; enc = null; placeOrb(o, true); SFX.setDuck(1); toast('Bạn bỏ đi. Cầu chữ lại lăn vào bụi cỏ khác.'); };

  // ---------- Thu phục ngay trên bản đồ: Hiyo ném trứng, chữ bay vào trứng ----------
  let cap = null;
  const EGG_BOT = new Path2D('M5 40 L12 34 L19 40 L26 34 L33 40 L40 34 L47 40 L55 34 C57 58 45 70 30 70 C15 70 4 58 5 40 Z');
  const EGG_TOP = new Path2D('M5 40 L12 34 L19 40 L26 34 L33 40 L40 34 L47 40 L55 34 C55 14 43 2 30 2 C17 2 5 16 5 40 Z');
  const EGG_STAR = new Path2D('M30 11 L32.6 17 L39 17.4 L34 21.5 L35.6 28 L30 24.4 L24.4 28 L26 21.5 L21 17.4 L27.4 17 Z');
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  function startCapture() {
    const o = enc.o; enc = null;
    $('hn-enc').hidden = true;
    const p = orbPos(o), pc = { x: P.x + P.w / 2, y: P.y + P.h / 2 };
    let dx = p.x - pc.x, dy = p.y - pc.y, d = Math.hypot(dx, dy);
    if (d < 1) { dx = P.face; dy = 0; d = 1; }
    dx /= d; dy /= d;
    const k = { x: p.x + dx * 46, y: p.y + dy * 30 - 26 };
    P.face = k.x >= pc.x ? 1 : -1;
    const col = o.shiny ? '#ec4899' : RAR[o.rar].color;
    const parts = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + Math.random() * 0.2, sp = 1.6 + Math.random() * 2.2; parts.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, r: 2.5 + Math.random() * 3, c: i % 3 ? col : '#facc15' }); }
    const frags = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; frags.push({ a, sp: 1.5 + Math.random() }); }
    cap = { o, t: 0, col, p, k, k0: { x: k.x, y: k.y }, s: { x: pc.x + P.face * 12, y: P.y - 20 }, h: { x: k.x, y: k.y - 40 }, g: { x: k.x, y: k.y + 44 }, parts, frags, trail: [], ticks: [],
      phase: 'hit' };
    orbs = orbs.filter((x) => x !== o);
    SFX.setDuck(0.6);
  }
  // chạm vào bản đồ trong lúc diễn hoạt cảnh để tua nhanh
  cv.addEventListener('pointerdown', () => { if (cap && cap.phase === 'hit' && cap.t > 1.9 && cap.t < 6.4) cap.t = 6.4; });
  const T_END = 7.3;
  // [thời điểm, âm thanh, tham số]
  const CAP_SND = [[0.001, 'pop'], [0.95, 'throw'], [1.55, 'hit'], [1.9, 'open'], [1.95, 'suck'], [2.72, 'close'], [3.23, 'bounce', 0], [3.4, 'bounce', 1], [3.49, 'bounce', 2],
    [3.68, 'wobble', 0], [3.97, 'tick', 0], [4.21, 'wobble', 1], [4.5, 'tick', 1], [4.74, 'wobble', 2], [5.03, 'tick', 2], [5.2, 'success'], [6.6, 'fly']];
  function stepCapture(dt) {
    const c = cap;
    const t0 = c.t;
    c.t += dt;
    const t = c.t;
    CAP_SND.forEach(([at, name, arg]) => { if (t0 <= at && t > at) SFX.play(name, arg); });
    // vệt sáng khi chữ bay vào trứng
    if (t > 1.9 && t < 2.7) { const kp = kanjiAt(t); c.trail.push({ x: kp.x, y: kp.y, life: 0.45 }); }
    c.trail = c.trail.filter((f) => (f.life -= dt) > 0);
    [3.97, 4.5, 5.03].forEach((tt, i) => { if (t >= tt && !c.ticks[i]) { c.ticks[i] = 1; fx.push({ t: 'tick', x: c.g.x + 16, y: c.g.y - 20, life: 0.6 }); } });
    // máy quay nhìn vào giữa Hiyo và chữ
    const mx = (P.x + P.w / 2 + c.k.x) / 2, my = (P.y + c.k.y) / 2;
    cam.x += (Math.max(0, Math.min(MW * T - vw(), mx - vw() / 2)) - cam.x) * 0.12;
    cam.y += (Math.max(0, Math.min(MH * T - vh(), my - vh() / 2)) - cam.y) * 0.12;
    fx = fx.filter((f) => (f.life -= dt) > 0);
    if (t >= T_END) finishCapture();
  }
  function kanjiAt(t) {
    const c = cap;
    if (t < 0.55) { const e = ease(t / 0.55); return { x: lerp(c.p.x, c.k.x, e), y: lerp(c.p.y - 8, c.k.y, e) - Math.sin(e * Math.PI) * 18, s: lerp(0.5, 1, e), r: 0 }; }
    if (t < 1.9) return { x: c.k.x, y: c.k.y + Math.sin(t * 4) * 3, s: 1 + (t > 1.55 && t < 1.75 ? Math.sin((t - 1.55) / 0.2 * Math.PI) * 0.25 : 0), r: 0 };
    const e = ease(seg(t, 1.9, 2.7));
    return { x: lerp(c.k.x, c.h.x, e) + Math.sin(e * Math.PI * 2) * 22 * (1 - e), y: lerp(c.k.y, c.h.y + 4, e), s: 1 - 0.85 * e, r: e * Math.PI * 2 };
  }
  function eggAt(t) {
    const c = cap;
    if (t < 0.95) return null;
    if (t < 1.55) { const e = seg(t, 0.95, 1.55); return { x: lerp(c.s.x, c.k.x, e), y: lerp(c.s.y, c.k.y, e) - Math.sin(e * Math.PI) * 70, r: e * Math.PI * 4, sc: lerp(0.6, 1, e), open: 0 }; }
    if (t < 1.9) { const e = ease(seg(t, 1.55, 1.9)); return { x: lerp(c.k.x, c.h.x, e) - Math.sin(e * Math.PI) * 10, y: lerp(c.k.y, c.h.y, e), r: (1 - e) * 0.6, sc: 1, open: 0 }; }
    if (t < 2.9) { const open = t < 2.05 ? seg(t, 1.9, 2.05) : t < 2.7 ? 1 : 1 - seg(t, 2.7, 2.85); return { x: c.h.x, y: c.h.y + Math.sin(t * 6) * 1.5, r: 0, sc: 1 + (t > 2.7 && t < 2.9 ? 0.1 : 0), open, glow: 1 }; }
    if (t < 3.5) {
      // rơi xuống đất, nảy 2 lần
      const e = seg(t, 2.9, 3.5); let y;
      if (e < 0.55) y = lerp(c.h.y, c.g.y, (e / 0.55) ** 2);
      else if (e < 0.85) { const q = (e - 0.55) / 0.3; y = c.g.y - Math.sin(q * Math.PI) * 18; }
      else { const q = (e - 0.85) / 0.15; y = c.g.y - Math.sin(q * Math.PI) * 5; }
      return { x: c.g.x, y, r: 0, sc: 1, open: 0 };
    }
    if (t < 5.2) {
      // lắc 3 lần
      const q = (t - 3.5) / 0.53, i = Math.floor(q), f = q - i;
      const w = i < 3 && f > 0.34 ? Math.sin((f - 0.34) / 0.66 * Math.PI * 2) * 0.38 * (1 - (f - 0.34) / 0.66 * 0.3) : 0;
      return { x: c.g.x + w * 6, y: c.g.y, r: w, sc: 1, open: 0, pivot: 1 };
    }
    if (t < 6.6) { const e = seg(t, 5.2, 5.5); return { x: c.g.x, y: c.g.y - Math.sin(e * Math.PI) * 8, r: 0, sc: 1 + Math.sin(e * Math.PI) * 0.3, open: 0, glow: 1 }; }
    // bay vào hộp sưu tập ở góc màn hình
    const e = ease(seg(t, 6.6, T_END)), bx = boxWorld();
    return { x: lerp(c.g.x, bx.x, e), y: lerp(c.g.y, bx.y, e) - Math.sin(e * Math.PI) * 50, r: e * Math.PI * 2, sc: lerp(1, 0.35, e), open: 0, glow: 1 };
  }
  function boxWorld() {
    const b = $('hn-box').getBoundingClientRect(), s = $('hn-stage').getBoundingClientRect();
    return { x: cam.x + (b.left - s.left + b.width / 2) / (scale * zoom), y: cam.y + (b.top - s.top + b.height / 2) / (scale * zoom) };
  }
  function drawEgg(e, col) {
    ctx.save();
    if (e.alpha != null) ctx.globalAlpha = Math.max(0, e.alpha);
    ctx.translate(e.x, e.y);
    if (e.pivot) { ctx.translate(0, 14); ctx.rotate(e.r); ctx.translate(0, -14); } else ctx.rotate(e.r);
    const k = 0.45 * e.sc; ctx.scale(k, k); ctx.translate(-30, -36);
    if (e.glow) { ctx.shadowColor = col; ctx.shadowBlur = 28; }
    ctx.fillStyle = '#fff7e6'; ctx.strokeStyle = '#b7834a'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.fill(EGG_BOT); ctx.shadowBlur = 0; ctx.stroke(EGG_BOT);
    ctx.fillStyle = '#ead2ad'; [[19, 54, 3], [37, 60, 2.4], [45, 48, 2.2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    if (e.open > 0) { // ánh sáng trong trứng
      const g = ctx.createRadialGradient(30, 38, 2, 30, 38, 26); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.globalAlpha = e.open; ctx.beginPath(); ctx.arc(30, 36, 26, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(5, 40); ctx.rotate(-e.open * 1.15); ctx.translate(-5 - e.open * 3, -40 - e.open * 6);
    ctx.fillStyle = '#fffbf0'; ctx.fill(EGG_TOP); ctx.stroke(EGG_TOP);
    ctx.fillStyle = '#ead2ad'; [[40, 24, 3], [16, 30, 2.2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    ctx.fillStyle = col; ctx.fill(EGG_STAR); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(EGG_STAR);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(17, 15, 5, 3, -0.6, 0, 7); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function drawCapture() {
    const c = cap, t = c.t, col = c.col;
    // ngọc vỡ
    if (t < 0.6) {
      const e = t / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - e; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.p.x, c.p.y - 8, 12 + e * 30, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      c.frags.forEach((f) => { const r = 10 + e * 40 * f.sp; ctx.save(); ctx.translate(c.p.x + Math.cos(f.a) * r, c.p.y - 8 + Math.sin(f.a) * r + e * e * 20); ctx.rotate(f.a + e * 4); ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, -3); ctx.lineTo(1, 4); ctx.fill(); ctx.restore(); });
      ctx.restore();
    }
    // vệt sáng
    c.trail.forEach((f) => { ctx.save(); ctx.globalAlpha = f.life / 0.45; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + f.life * 6, 0, 7); ctx.fill(); ctx.restore(); });
    // chữ Kanji
    if (t < 2.7) {
      const kp = kanjiAt(t), light = t > 1.55;
      ctx.save(); ctx.translate(kp.x, kp.y); ctx.rotate(kp.r); ctx.scale(kp.s, kp.s);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); g.addColorStop(0, light ? 'rgba(255,255,255,.95)' : col); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = light ? 0.95 : 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = '600 30px "Klee One", "Hiragino Mincho ProN", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = light ? col : '#fff'; ctx.shadowBlur = light ? 18 : 6;
      ctx.lineWidth = 4; ctx.strokeStyle = light ? col : '#fff'; ctx.strokeText(c.o.ch, 0, 1);
      ctx.fillStyle = light ? '#fff' : '#1c1917'; ctx.fillText(c.o.ch, 0, 1);
      ctx.restore();
    }
    // tia chớp khi trứng trúng chữ / đóng nắp
    [[1.55, c.k], [2.72, c.h]].forEach(([tt, q]) => { const e = seg(t, tt, tt + 0.4); if (e > 0 && e < 1) { ctx.save(); ctx.globalAlpha = 1 - e; const g = ctx.createRadialGradient(q.x, q.y, 1, q.x, q.y, 10 + e * 60); g.addColorStop(0, '#fff'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 10 + e * 60, 0, 7); ctx.fill(); ctx.restore(); } });
    // bung sao: thu phục thành công
    if (t > 5.2 && t < 6.9) {
      const e = seg(t, 5.2, 6.6), gx = c.g.x, gy = c.g.y;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.8); ctx.globalAlpha = Math.min(1, (1 - e) * 2) * 0.55;
      for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = i % 2 ? col : '#fde68a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -70 - e * 30); ctx.lineTo(7, -70 - e * 30); ctx.fill(); }
      ctx.restore();
      [0, 0.12, 0.24].forEach((dl, i) => { const q = seg(t, 5.2 + dl, 6 + dl); if (q > 0 && q < 1) { ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = ['#fff', col, '#facc15'][i]; ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(gx, gy, 14 + q * 80, 0, 7); ctx.stroke(); ctx.restore(); } });
      const pt = Math.max(0, t - 5.2) * 60;
      c.parts.forEach((p) => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e * 1.1); ctx.translate(gx + p.vx * pt, gy + p.vy * pt + 0.02 * pt * pt); ctx.rotate(pt * 0.1); ctx.fillStyle = p.c; star(0, 0, p.r); ctx.restore(); });
      // nhãn "Thu phục!"
      const st = seg(t, 5.35, 5.6);
      if (st > 0) {
        ctx.save(); ctx.translate(gx, gy - 52); ctx.rotate(-0.07); const sc = lerp(1.7, 1, ease(st)) * (VW * scale < 600 ? 0.8 : 1); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, st * 2) * Math.min(1, (6.9 - t) * 3);
        ctx.font = '900 15px "Zen Maru Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText('Thu phục!').width + 22;
        ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -13, w, 26, 13) : ctx.rect(-w / 2, -13, w, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText('Thu phục!', 0, 1);
        ctx.restore();
      }
    }
    const e = eggAt(t);
    if (e) drawEgg(e, col);
  }
  function finishCapture() {
    const o = cap.o, perfect = cap.perfect; cap = null;
    const first = saveCatch(o.ch, o.shiny);
    const stars = Math.max(1, 3 - (wanted ? wanted.miss : 0));
    const xp = RAR[o.rar].xp * (o.shiny ? 2 : 1) + (stars - 1) + (perfect ? 1 : 0);
    const res = window.Sumi ? Sumi.addXP(xp) : null;
    SFX.play('box'); if (first) SFX.play('fresh', 0, 0.25); SFX.setDuck(1);
    const bx = $('hn-box'); bx.classList.remove('got'); void bx.offsetWidth; bx.classList.add('got');
    hud();
    G.caught++; heroPanel();
    const lifeUp = G.lives < maxLife(); addLife(1);
    showResult(o, first, xp, stars, perfect, lifeUp);
    newWanted();
    if (res && res.goalJustMet && window.sumiGoalCelebrate) sumiGoalCelebrate(res);
  }
  function showResult(o, first, xp, stars, perfect, lifeUp) {
    const d = data[o.ch] || {}; const w = (d.w || []).find((x) => x[0].includes(o.ch) && x[1]);
    const n = book()[o.ch].n, col = o.shiny ? '#ec4899' : RAR[o.rar].color;
    $('hn-got').innerHTML = '<div class="hn-res" style="--c:' + col + '">' +
      '<div class="hn-res-k"><span>' + o.ch + '</span></div>' +
      '<div class="hn-res-body"><div class="hn-res-top"><b>Đã cho vào hộp!</b>' + (first ? ' <span class="hn-new">MỚI</span>' : '') + '<span class="hn-rar ' + (o.shiny ? 'r4' : 'r' + o.rar) + '">' + (o.shiny ? '✦ ' : '') + RAR[o.rar].name + '</span></div>' +
      '<div><b>' + esc(hvOf(o.ch) || '–') + '</b> · ' + esc(IDX[o.ch] ? IDX[o.ch][1] : '') + '</div>' +
      (w ? '<div class="jp">' + esc(w[0]) + ' <small>' + esc(w[1]) + '</small> · <span>' + esc(w[3] || '') + '</span></div>' : '') +
      '<div class="hn-res-stars">Thưởng truy nã <i>' + '★'.repeat(stars) + '<s>' + '★'.repeat(3 - stars) + '</s></i>' + (perfect ? ' · <b>Ném tuyệt vời!</b>' : '') + '</div>' +
      '<small>Bắt ' + n + ' lần · +' + xp + '⭐' + (lifeUp ? ' · <b style="color:#e11d48">+1 mạng ♥</b>' : '') + '</small></div>' +
      '<div class="hn-res-acts"><button class="act-btn primary" id="hn-cont">Lệnh truy nã mới</button><button class="act-btn" id="hn-open-book">Mở hộp</button></div></div>';
    $('hn-got').hidden = false;
    $('hn-cont').onclick = () => { $('hn-got').hidden = true; };
    $('hn-open-book').onclick = () => { $('hn-got').hidden = true; openBook(o.ch); };
  }

  // ---------- Hộp sưu tập ----------
  let boxFilter = 0;
  function openBook(sel) {
    const b = book(), total = chars.length, n = Object.keys(b).filter((c) => chars.includes(c)).length;
    const cnt = [0, 0, 0, 0]; chars.forEach((c) => { if (b[c]) cnt[rarity(c)]++; });
    const shiny = chars.filter((c) => b[c] && b[c].sh).length;
    const tabs = [['Tất cả', n], ['Thường', cnt[1]], ['Hiếm', cnt[2]], ['Quý', cnt[3]], ['✦ Lấp lánh', shiny]];
    const show = chars.filter((c) => boxFilter === 0 || (boxFilter === 4 ? b[c] && b[c].sh : rarity(c) === boxFilter)).sort((x, y) => (b[y] ? 1 : 0) - (b[x] ? 1 : 0));
    $('hn-book').innerHTML = '<div class="hb">' +
      '<div class="hb-lid"><div class="hb-title"><i class="hb-knob"></i><div><b>Hộp sưu tập chữ</b><small>' + esc(levelName) + '</small></div><button class="hb-x" id="hn-book-close" aria-label="Đóng">✕</button></div>' +
      '<div class="hb-prog"><div class="hb-bar"><i style="width:' + (total ? n / total * 100 : 0).toFixed(1) + '%"></i></div><span>' + n + ' / ' + total + '</span></div>' +
      '<div class="hb-tabs">' + tabs.map((t, i) => '<button data-f="' + i + '" class="' + (i === boxFilter ? 'on' : '') + '">' + t[0] + ' <em>' + t[1] + '</em></button>').join('') + '</div></div>' +
      '<div class="hb-tray"><div class="hb-grid">' + show.map((c) => b[c]
        ? '<button class="hb-cell c' + rarity(c) + (b[c].sh ? ' sh' : '') + (c === sel ? ' sel' : '') + '" data-c="' + c + '"><span>' + c + '</span>' + (b[c].n > 1 ? '<small>×' + b[c].n + '</small>' : '') + '</button>'
        : '<div class="hb-cell empty"><span>?</span></div>').join('') + (show.length ? '' : '<p class="hb-none">Chưa có chữ nào ở mục này.</p>') + '</div></div>' +
      '<div class="hb-info" id="hn-book-info"><p>Chạm vào một quả trứng chữ để xem chi tiết.</p></div></div>';
    if ($('hn-book').hidden) SFX.play('boxopen');
    $('hn-book').hidden = false;
    const info = (c) => {
      const d = data[c] || {}, w = (d.w || []).find((x) => x[0].includes(c) && x[1]);
      document.querySelectorAll('.hb-cell.sel').forEach((x) => x.classList.remove('sel'));
      const el = document.querySelector('.hb-cell[data-c="' + c + '"]'); if (el) el.classList.add('sel');
      $('hn-book-info').innerHTML = '<div class="hb-big c' + rarity(c) + '">' + c + '</div><div class="hb-det"><div><b>' + esc(hvOf(c) || '') + '</b> · ' + esc(IDX[c] ? IDX[c][1] : '') + '</div>' +
        (readingsOf(c).length ? '<div class="jp">' + esc([].concat(d.on || []).slice(0, 3).join('、')) + (d.kun && d.kun.length ? ' ／ ' + esc([].concat(d.kun).slice(0, 3).join('、')) : '') + '</div>' : '') +
        (w ? '<div><span class="jp">' + esc(w[0]) + '</span> <small class="jp">' + esc(w[1]) + '</small> ' + esc(w[3] || '') + '</div>' : '') +
        '<small>' + RAR[rarity(c)].name + (b[c].sh ? ' · ✦ đã có bản lấp lánh' : '') + ' · bắt ' + b[c].n + ' lần</small></div>';
    };
    $('hn-book').querySelector('.hb-grid').onclick = (e) => { const s = e.target.closest('[data-c]'); if (s) { SFX.play('click'); info(s.dataset.c); } };
    $('hn-book').querySelector('.hb-tabs').onclick = (e) => { const t = e.target.closest('[data-f]'); if (t) { boxFilter = Number(t.dataset.f); openBook(); } };
    $('hn-book-close').onclick = () => { $('hn-book').hidden = true; };
    if (sel && b[sel]) info(sel);
  }
  $('hn-book-btn').onclick = () => { if (!enc && !cap && chars.length) openBook(); };
  $('hn-box').onclick = () => { if (!enc && !cap && chars.length) openBook(); };

  // ---------- Khung nhân vật (góc trái trên) & trang cá nhân ----------
  function renderHero(cv, form, t, mood) {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const im = himg(mood || 'happy', form);
    if (!im.complete && !im._hooked) { im._hooked = 1; im.addEventListener('load', () => heroPanel()); }
    const sz = w * 0.5;
    GEAR.drawHero(c, im, w / 2, h * 0.84, sz, hero.eq, t, 1);
  }
  let lastDue = -1;
  function heroPanel() {
    const lv = heroLevel(), due = dueList().length;
    $('hn-lv').textContent = lv;
    $('hn-lvbar').style.width = (lv / LV_MAX * 100).toFixed(2) + '%';
    if (due !== lastDue) { lastDue = due; $('hn-due').hidden = !due; $('hn-due').textContent = 'Ôn ' + due; }
    if (!$('hn-heropage').hidden) heroPage();
  }
  $('hn-hero').onclick = () => { if (!enc && !cap) heroPage(true); };
  $('hn-due').onclick = (e) => { e.stopPropagation(); startReview(); };
  let hpSel = null, hpTab = 'all';
  function heroPage(open) {
    const owned = Object.keys(hero.gear).filter((k) => hero.gear[k] > 0 && GEAR.BY[k]).length, lv = heroLevel(), due = dueList().length;
    const items = GEAR.LIST.filter((g) => hpTab === 'all' || g.slot === hpTab);
    const el = $('hn-heropage');
    el.innerHTML = '<div class="hp"><button class="hb-x hp-x" id="hp-close" aria-label="Đóng">✕</button>' +
      '<div class="hp-top"><div class="hp-av"><canvas id="hp-cv" width="360" height="360"></canvas></div><div class="hp-info">' +
      '<div class="hp-name">' + esc(hero.name) + '</div><div class="hp-lv">Lv <b>' + lv + '</b><small> / ' + LV_MAX + '</small></div>' +
      '<div class="hp-bar"><i style="width:' + (lv / LV_MAX * 100).toFixed(2) + '%"></i></div><small class="hp-note">Mỗi chữ Kanji thu phục được = 1 level</small>' +
      '<div class="hp-stats"><span><b>' + lv + '</b>chữ đã thu phục</span><span><b>' + hero.kills + '</b>quái đã hạ</span><span><b>' + hero.gold + '</b>vàng tích luỹ</span><span><b>' + owned + '/' + GEAR.LIST.length + '</b>phụ kiện</span></div>' +
      '<button class="act-btn ' + (due ? 'primary' : '') + ' hp-rev" id="hp-rev">' + (due ? '📖 Ôn tập hôm nay: ' + due + ' chữ' : '✓ Hôm nay đã ôn xong') + '</button>' +
      (due ? '<small class="hp-note">Trả lời sai khi ôn thì chữ trốn khỏi hộp và level giảm.</small>' : '') + '</div></div>' +
      '<div class="hp-slots">' + GEAR.SLOTS.map(([k, n]) => { const id = hero.eq[k]; return '<button class="hp-slot' + (id ? ' on' : '') + '" data-slot="' + k + '">' + (id ? '<img src="' + GEAR.iconURL(id, 48) + '" alt="">' : '<i>+</i>') + '<small>' + n + '</small></button>'; }).join('') + '</div>' +
      '<div class="hp-tabs"><button data-t="all" class="' + (hpTab === 'all' ? 'on' : '') + '">Tất cả</button>' + GEAR.SLOTS.map(([k, n]) => '<button data-t="' + k + '" class="' + (hpTab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div>' +
      '<div class="hp-grid">' + items.map((g) => { const n = hero.gear[g.id] || 0, on = hero.eq[g.slot] === g.id; return '<button class="hp-it r' + g.r + (n ? '' : ' lock') + (on ? ' eq' : '') + (hpSel === g.id ? ' sel' : '') + '" data-id="' + g.id + '"><img src="' + GEAR.iconURL(g.id, 56) + '" alt=""><span>' + (n ? esc(g.name) : '???') + '</span>' + (n > 1 ? '<em>×' + n + '</em>' : '') + (on ? '<b>Đang đeo</b>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="hp-det" id="hp-det">' + detail() + '</div></div>';
    if (open) { el.hidden = false; SFX.play('boxopen'); }
    const cv = $('hp-cv'); renderHero(cv, FORM_OF[G.lv], performance.now() / 1000, 'cheer');
    $('hp-close').onclick = () => { el.hidden = true; };
    $('hp-rev').onclick = () => { if (dueList().length) startReview(); };
    el.querySelector('.hp-tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { hpTab = b.dataset.t; heroPage(); } };
    el.querySelector('.hp-grid').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { hpSel = b.dataset.id; SFX.play('click'); heroPage(); } };
    el.querySelector('.hp-slots').onclick = (e) => { const b = e.target.closest('[data-slot]'); if (b && hero.eq[b.dataset.slot]) { hpSel = hero.eq[b.dataset.slot]; heroPage(); } };
    const act = $('hp-act');
    if (act) act.onclick = () => { const g = GEAR.BY[hpSel]; if (hero.eq[g.slot] === g.id) delete hero.eq[g.slot]; else hero.eq[g.slot] = g.id; saveHero(); SFX.play('fresh'); hud(); heroPage(); };
  }
  function detail() {
    const g = GEAR.BY[hpSel];
    if (!g) return '<p>Hạ quái thú để nhặt phụ kiện. Chạm vào một phụ kiện để xem công năng và đeo cho Hiyo.</p>';
    const n = hero.gear[g.id] || 0, on = hero.eq[g.slot] === g.id, slotName = (GEAR.SLOTS.find((x) => x[0] === g.slot) || [])[1];
    if (!n) return '<div class="hp-dicon lock"><img src="' + GEAR.iconURL(g.id, 80) + '" alt=""></div><div><b>???</b><small>Ô ' + esc(slotName) + ' · ' + GEAR.RNAME[g.r] + '</small><p>Chưa có. Hạ thêm quái thú để tìm phụ kiện này!</p></div>';
    return '<div class="hp-dicon"><img src="' + GEAR.iconURL(g.id, 80) + '" alt=""></div><div><b>' + esc(g.name) + '</b><small style="color:' + GEAR.RCOL[g.r] + '">' + GEAR.RNAME[g.r] + ' · ô ' + esc(slotName) + ' · có ' + n + '</small><p>' + esc(g.desc) + '</p></div>' +
      '<button class="act-btn ' + (on ? '' : 'primary') + '" id="hp-act">' + (on ? 'Tháo ra' : 'Đeo vào') + '</button>';
  }

  // ---------- Giao diện ----------
  function hud() {
    const n = Object.keys(book()).filter((c) => chars.includes(c)).length;
    $('hn-book-n').textContent = n + '/' + chars.length;
    $('hn-box-n').textContent = n;
    $('hn-life').innerHTML = '<span class="hl-hearts">' + '♥'.repeat(Math.max(0, G.lives)) + '<s>' + '♥'.repeat(Math.max(0, maxLife() - G.lives)) + '</s></span><span class="hl-gold"><i></i>' + G.coins + '</span><span class="hl-weap" style="--wc:' + WEAP[G.lv].col + '"><i></i>' + WEAP[G.lv].name + ' · Lv' + (G.lv + 1) + '</span>';
    $('hn-caught').textContent = 'Đã thu phục ' + n + '/' + chars.length + ' chữ · ' + levelName;
  }
  let toastT = null;
  function toast(html) { const t = $('hn-toast'); t.innerHTML = html; t.className = 'hn-toast show'; clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'hn-toast'; }, 2600); }

  let last = 0, acc = 0, lastThrow = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const busy = enc || cap || G.over || !$('hn-got').hidden || !$('hn-book').hidden || !$('hn-heropage').hidden;
    if (busy) G.fire = G.fire && !enc && !cap;
    const zt = cap && cap.t < 6.5 ? (VW * scale < 600 ? 1.3 : 1.75) : 1;
    zoom += (zt - zoom) * Math.min(1, dt * 4);
    if (cap) stepCapture(dt);
    if (running && !busy) { acc += dt; while (acc >= 1 / 60) { step(); acc -= 1 / 60; } } else acc = 0;
    draw();
    const tt = now / 1000;
    if (!heroCv) heroCv = $('hn-hero-cv');
    if (Math.floor(tt * 20) !== lastHeroF) { lastHeroF = Math.floor(tt * 20); renderHero(heroCv, FORM_OF[G.lv], tt, G.inv > 1.2 ? 'sad' : 'happy'); }
  }
  let heroCv = null, lastHeroF = -1;

  // ---------- Bật / tắt âm thanh ----------
  function soundBtns() { const p = SFX.pref(); $('hn-snd').classList.toggle('off', !p.sfx); $('hn-mus').classList.toggle('off', !p.music); $('hn-snd').title = p.sfx ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'; $('hn-mus').title = p.music ? 'Tắt nhạc nền' : 'Bật nhạc nền'; }
  $('hn-snd').onclick = () => { SFX.init(); SFX.toggle('sfx'); SFX.play('click'); soundBtns(); };
  $('hn-mus').onclick = () => { SFX.init(); SFX.toggle('music'); if (running) SFX.musicStart(); soundBtns(); };
  soundBtns();

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  document.title = 'Săn cầu chữ – ' + levelName + ' – Sumi Kanji';
  $('hn-menu-hiyo').innerHTML = HIYO.svg(currentForm(), 'cheer', { cls: 'hn-hiyo' });
  
  $('hn-menu-sub').textContent = 'Cầu chữ chứa các chữ của ' + levelName + '. Ưu tiên chữ bạn chưa thu phục.';
  genMap();
  P.x = start.x; P.y = start.y;
  resize();
  $('hn-go').disabled = true;
  sumiLoadLevel(levelId).then((d) => {
    data = d;
    chars = levelChars(levelId).filter((c) => IDX[c] && data[c]);
    newWanted();
    setupWorld();
    hud(); heroPanel();
    $('hn-go').disabled = false;
  }).catch((err) => toast(esc(err.message)));
  $('hn-go').onclick = () => { SFX.init(); SFX.musicStart(); SFX.play('fresh'); $('hn-menu').hidden = true; running = true; resize(); const due = dueList().length; toast(due ? '📖 Hôm nay có <b>' + due + '</b> chữ cần ôn! Bấm nút <b>Ôn</b> ở khung nhân vật. Trả lời sai chữ sẽ trốn khỏi hộp.' : 'Đi theo <b>chấm vàng</b> trên ra-đa để tìm chữ bị truy nã!'); };
  last = performance.now(); requestAnimationFrame(loop);
})();
