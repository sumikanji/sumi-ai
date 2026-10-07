/*! © 2026 Sumi Kanji */
// ===== Hiyo hứng chữ: luyện phản xạ nhận mặt chữ =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = window.sumiEsc || ((t) => String(t));
  const params = new URLSearchParams(location.search);
  const P = window.SumiPath;
  const levelId = LEVELS[params.get('level')] ? params.get('level') : (P && P.current()) || 'g1';
  if (P && !P.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const IDX = window.SUMI_INDEX || {};
  const BEST_KEY = 'sumiKanji.catchBest';
  const POOL_KEY = 'sumiKanji.catchPool';
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1].split(/[;,]/)[0].trim() : '');
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };

  // ---------- Chữ dùng trong game ----------
  function poolOf(v) {
    const chars = levelChars(levelId).filter((c) => IDX[c]);
    if (v === 'learned') { const l = loadLearned(); return chars.filter((c) => l[c]); }
    if (v === 'fav') return chars.filter((c) => SumiFav.has(c));
    return P ? chars.filter((c) => P.charOpen(levelId, c)) : chars;
  }
  let poolMode = store.get(POOL_KEY, 'learned');
  function drawPoolBtns() {
    document.querySelectorAll('#cg-pool button').forEach((b) => {
      const n = poolOf(b.dataset.v).length;
      b.querySelector('small').textContent = n;
      b.disabled = n < 4;
      b.title = n < 4 ? 'Cần ít nhất 4 chữ' : '';
      b.classList.toggle('on', b.dataset.v === poolMode);
    });
    if (poolOf(poolMode).length < 4) {
      const ok = ['learned', 'fav', 'open'].find((v) => poolOf(v).length >= 4);
      if (ok && ok !== poolMode) { poolMode = ok; drawPoolBtns(); }
    }
    $('cg-go').disabled = poolOf(poolMode).length < 4;
  }
  $('cg-pool').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    poolMode = b.dataset.v; store.set(POOL_KEY, poolMode); drawPoolBtns();
  });

  // ---------- Canvas ----------
  const cv = $('cg-canvas');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const box = $('cg-stage').getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = box.width; H = box.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G) G.hx = Math.min(Math.max(G.hx, HW / 2), W - HW / 2);
  }
  window.addEventListener('resize', resize);

  // Hình Hiyo (ảnh SVG theo dạng tiến hóa hiện tại)
  const HW = 84, HH = 78;
  const IMG = {};
  ['happy', 'joy', 'sad', 'wow'].forEach((m) => {
    const svg = HIYO.svg(currentForm(), m, { cls: 'x' }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    IMG[m] = im;
  });
  $('cg-start-hiyo').innerHTML = HIYO.svg(currentForm(), 'cheer', { cls: 'cg-hiyo-svg' });

  // ---------- Trạng thái ----------
  let G = null;
  window.__sumiCatch = () => G; // hỗ trợ kiểm thử tự động
  function newGame() {
    const pool = poolOf(poolMode);
    G = {
      pool, items: [], hx: W / 2, tx: W / 2, score: 0, combo: 0, best: 0, lives: 3, level: 1, caught: 0,
      target: null, askHv: false, spawnT: 0, sinceTarget: 0, mood: 'happy', moodT: 0, running: true, paused: false,
      good: {}, bad: {}, missed: {}, sparks: [], t0: performance.now(), last: performance.now()
    };
    nextTarget();
    $('cg-start').hidden = true; $('cg-end').hidden = true; $('cg-pause').hidden = true;
    $('cg-pause-btn').disabled = false;
    hud();
    requestAnimationFrame(loop);
  }
  function nextTarget() {
    const prev = G.target;
    // ưu tiên chọn chữ đang rơi giữa màn hình để nhịp chơi liên tục
    const inAir = G.items.filter((it) => it.c !== prev && it.y > H * 0.12 && it.y < H * 0.6).map((it) => it.c);
    let c = inAir.length && Math.random() < 0.75 ? rand(inAir) : rand(G.pool);
    for (let k = 0; k < 5 && c === prev; k++) c = rand(G.pool);
    G.target = c;
    // chữ đích cũ còn đang rơi thì bỏ đi, tránh bị tính là hứng nhầm
    if (prev) G.items = G.items.filter((it) => it.c !== prev);
    // Từ cấp 3 trở đi, xen kẽ hỏi bằng âm Hán Việt
    G.askHv = G.level >= 3 && hvOf(c) && Math.random() < 0.4;
    $('cg-ask').textContent = G.askHv ? 'Hứng chữ có âm Hán Việt' : 'Hứng chữ có nghĩa';
    $('cg-word').textContent = G.askHv ? hvOf(c) : viOf(c);
    $('cg-word').classList.remove('pop'); void $('cg-word').offsetWidth; $('cg-word').classList.add('pop');
    G.sinceTarget = 0;
    G.forceTarget = true;
    if (G.spawnT > 0.35) G.spawnT = 0.35;
  }
  function hud() {
    $('cg-score').textContent = G.score;
    $('cg-hearts').textContent = '♥'.repeat(G.lives) + '♡'.repeat(Math.max(0, 3 - G.lives));
    $('cg-combo').textContent = G.combo >= 2 ? 'Combo ×' + G.combo : '';
    $('cg-level').textContent = 'Cấp độ ' + G.level + ' · ' + G.pool.length + ' chữ';
  }
  const speed = () => 135 + G.level * 22;            // px/giây
  const spawnGap = () => Math.max(0.4, 0.85 - G.level * 0.07); // giây

  function spawn() {
    const isTarget = G.forceTarget || G.sinceTarget >= 3 || (G.sinceTarget >= 1 && Math.random() < 0.25);
    G.forceTarget = false;
    let c;
    if (isTarget) c = G.target;
    else { const others = G.pool.filter((x) => x !== G.target); c = rand(others); }
    if (c === G.target) G.sinceTarget = 0; else G.sinceTarget++;
    const r = W < 420 ? 26 : 30;
    // tránh chồng lên chữ vừa rơi
    let x, tries = 0;
    do { x = r + 6 + Math.random() * (W - 2 * r - 12); tries++; } while (tries < 8 && G.items.some((it) => it.y < 80 && Math.abs(it.x - x) < r * 2.2));
    G.items.push({ c, x, y: -r, r, vy: speed() * (0.85 + Math.random() * 0.3), wob: Math.random() * 6 });
  }

  // ---------- Vòng lặp ----------
  function loop(now) {
    if (!G || !G.running) return;
    if (G.paused) { G.last = now; requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (now - G.last) / 1000);
    G.last = now;
    // di chuyển Hiyo mượt theo điểm đích
    G.hx += (G.tx - G.hx) * Math.min(1, dt * 14);
    G.hx = Math.min(Math.max(G.hx, HW / 2), W - HW / 2);
    G.spawnT -= dt;
    if (G.spawnT <= 0) { spawn(); G.spawnT = spawnGap(); }
    const top = H - HH - 6;
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.y += it.vy * dt;
      it.wob += dt * 3;
      const hit = it.y + it.r * 0.6 >= top + 10 && it.y - it.r <= top + HH * 0.6 && Math.abs(it.x - G.hx) < HW / 2 + it.r * 0.4;
      if (hit) { G.items.splice(i, 1); catchIt(it); continue; }
      if (it.y - it.r > H) {
        G.items.splice(i, 1);
        if (it.c === G.target) { G.combo = 0; G.missed[it.c] = (G.missed[it.c] || 0) + 1; hud(); }
      }
    }
    G.sparks = G.sparks.filter((s) => (s.t -= dt) > 0);
    if (G.moodT > 0 && (G.moodT -= dt) <= 0) G.mood = 'happy';
    draw();
    requestAnimationFrame(loop);
  }
  function catchIt(it) {
    if (it.c === G.target) {
      G.combo++; G.caught++;
      const pts = 10 * G.level + Math.min(G.combo, 10) * 2;
      G.score += pts;
      G.good[it.c] = (G.good[it.c] || 0) + 1;
      G.mood = G.combo >= 5 ? 'wow' : 'joy'; G.moodT = 0.6;
      floatText('+' + pts + ' ' + it.c + ' ' + hvOf(it.c), 'ok', it.x);
      G.sparks.push({ x: it.x, y: H - HH, t: 0.5, ok: true });
      if (G.caught % 6 === 0) { G.level++; floatText('Cấp độ ' + G.level + '!', 'lv', W / 2); }
      nextTarget();
    } else {
      G.lives--; G.combo = 0;
      G.bad[it.c] = (G.bad[it.c] || 0) + 1;
      G.mood = 'sad'; G.moodT = 0.8;
      floatText('✗ ' + it.c + ' = ' + viOf(it.c), 'bad', it.x);
      G.sparks.push({ x: it.x, y: H - HH, t: 0.5, ok: false });
      $('cg-stage').classList.remove('hurt'); void $('cg-stage').offsetWidth; $('cg-stage').classList.add('hurt');
      if (G.lives <= 0) { hud(); return gameOver(); }
    }
    hud();
  }
  function floatText(t, cls, x) {
    const el = document.createElement('span');
    el.className = 'ft ' + cls;
    el.textContent = t;
    el.style.left = Math.min(Math.max(x, 70), W - 70) + 'px';
    $('cg-float').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // chữ rơi
    G.items.forEach((it) => {
      const x = it.x + Math.sin(it.wob) * 2;
      ctx.beginPath(); ctx.arc(x, it.y, it.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#eadfbf'; ctx.stroke();
      ctx.fillStyle = '#332d29';
      ctx.font = '600 ' + Math.round(it.r * 1.15) + 'px "Klee One", "Hiragino Mincho ProN", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.c, x, it.y + 1);
    });
    // tia sáng khi hứng
    G.sparks.forEach((s) => {
      ctx.globalAlpha = s.t * 2;
      ctx.strokeStyle = s.ok ? '#22c55e' : '#ef4444'; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3, r1 = 18 + (0.5 - s.t) * 60, r2 = r1 + 10;
        ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1); ctx.lineTo(s.x + Math.cos(a) * r2, s.y + Math.sin(a) * r2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    // bóng + Hiyo
    const top = H - HH - 6;
    ctx.fillStyle = 'rgba(161, 98, 7, .12)';
    ctx.beginPath(); ctx.ellipse(G.hx, H - 6, HW * 0.38, 5, 0, 0, Math.PI * 2); ctx.fill();
    const im = IMG[G.mood] || IMG.happy;
    const bob = G.mood === 'joy' || G.mood === 'wow' ? -Math.abs(Math.sin(performance.now() / 70)) * 5 : 0;
    if (im.complete) ctx.drawImage(im, G.hx - HW / 2, top + bob, HW, HH);
  }

  // ---------- Điều khiển ----------
  function setX(clientX) {
    const r = cv.getBoundingClientRect();
    if (G) G.tx = clientX - r.left;
  }
  $('cg-stage').addEventListener('pointermove', (e) => { if (G && G.running) setX(e.clientX); });
  $('cg-stage').addEventListener('pointerdown', (e) => { if (G && G.running && !G.paused && e.target === cv) { setX(e.clientX); cv.setPointerCapture(e.pointerId); } });
  $('cg-stage').addEventListener('touchmove', (e) => { if (G && G.running) e.preventDefault(); }, { passive: false });
  const keys = {};
  document.addEventListener('keydown', (e) => {
    if (!G || !G.running) { if (e.key === 'Enter' && !$('cg-start').hidden && !$('cg-go').disabled) newGame(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });
  setInterval(() => {
    if (!G || !G.running || G.paused) return;
    if (keys.ArrowLeft) G.tx = Math.max(HW / 2, G.tx - 18);
    if (keys.ArrowRight) G.tx = Math.min(W - HW / 2, G.tx + 18);
  }, 16);
  function togglePause(force) {
    if (!G || !G.running) return;
    G.paused = force != null ? force : !G.paused;
    $('cg-pause').hidden = !G.paused;
  }
  $('cg-pause-btn').onclick = () => togglePause();
  $('cg-resume').onclick = () => togglePause(false);
  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });

  // ---------- Kết thúc ----------
  function gameOver() {
    G.running = false;
    $('cg-pause-btn').disabled = true;
    const best = store.get(BEST_KEY, {});
    const prev = best[levelId] || 0;
    const isBest = G.score > prev;
    if (isBest) { best[levelId] = G.score; store.set(BEST_KEY, best); }
    $('top-best').textContent = 'Kỷ lục ' + Math.max(prev, G.score);
    const xp = G.caught ? Sumi.addXP(Math.min(20, G.caught)) : null;
    const weak = Object.keys(G.bad).concat(Object.keys(G.missed)).filter((c, i, a) => a.indexOf(c) === i);
    const goodList = Object.keys(G.good);
    $('cg-end').innerHTML =
      '<div class="cg-hiyo">' + HIYO.svg(currentForm(), isBest ? 'joy' : 'cheer', { cls: 'cg-hiyo-svg' }) + '</div>' +
      '<h1>' + (isBest && G.score ? 'Kỷ lục mới!' : 'Hết lượt!') + '</h1>' +
      '<div class="cg-big">' + G.score + '<small>điểm</small></div>' +
      '<p class="cg-sum">Hứng đúng <b>' + G.caught + '</b> chữ · đạt cấp độ <b>' + G.level + '</b>' + (xp ? ' · +' + Math.min(20, G.caught) + '⭐' : '') + '</p>' +
      (goodList.length ? '<div class="cg-list ok"><span>Đã hứng đúng</span>' + goodList.map((c) => '<b title="' + esc(viOf(c)) + '">' + c + '</b>').join('') + '</div>' : '') +
      (weak.length ? '<div class="cg-list bad"><span>Cần xem lại</span>' + weak.map((c) => '<a href="level.html?id=' + (gradeLevelOf(c) || levelId) + '&k=' + encodeURIComponent(c) + '" title="' + esc(hvOf(c) + ' – ' + viOf(c)) + '">' + c + '<small>' + esc(viOf(c)) + '</small></a>').join('') + '</div>' : '') +
      '<div class="cg-acts"><button class="act-btn primary" id="cg-again">↺ Chơi lại</button><a class="act-btn" href="level.html?id=' + levelId + '">🗺 Về ' + esc(levelName) + '</a></div>';
    $('cg-end').hidden = false;
    $('cg-again').onclick = newGame;
    if (xp && xp.goalJustMet && window.sumiGoalCelebrate) sumiGoalCelebrate(xp);
  }

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  document.title = 'Hiyo hứng chữ – ' + levelName + ' – Sumi Kanji';
  $('top-best').textContent = 'Kỷ lục ' + (store.get(BEST_KEY, {})[levelId] || 0);
  $('cg-go').onclick = newGame;
  drawPoolBtns();
  resize();
  if (poolOf('open').length < 4) {
    $('cg-go').disabled = true;
    $('cg-start').querySelector('p').innerHTML = 'Cần ít nhất 4 chữ để chơi. Hãy học thêm vài chữ ở <a href="level.html?id=' + levelId + '">' + esc(levelName) + '</a> nhé!';
  }
})();
