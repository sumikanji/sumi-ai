/*! © 2026 Sumi Kanji */
// ===== Nhìn rồi viết: nhớ hình chữ, viết lại, chấm từng nét bằng dữ liệu KanjiVG =====
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
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1].split(/[;,]/)[0].trim() : '');
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const ROUND = 10;
  let data = {};

  // ---------- Chọn chữ ----------
  let poolMode = store.get('sumiKanji.memoPool', 'learned');
  function poolOf(v) {
    const chars = levelChars(levelId).filter((c) => !Object.keys(data).length || (data[c] && data[c].p && data[c].p.length));
    if (v === 'learned') { const l = loadLearned(); return chars.filter((c) => l[c]); }
    if (v === 'fav') return chars.filter((c) => SumiFav.has(c));
    return P ? chars.filter((c) => P.charOpen(levelId, c)) : chars;
  }
  function drawPool() {
    document.querySelectorAll('#mm-pool button').forEach((b) => {
      const n = poolOf(b.dataset.v).length;
      b.querySelector('small').textContent = n;
      b.disabled = n < 1;
      b.classList.toggle('on', b.dataset.v === poolMode);
    });
    if (!poolOf(poolMode).length) { const ok = ['learned', 'fav', 'open'].find((v) => poolOf(v).length); if (ok) poolMode = ok; document.querySelectorAll('#mm-pool button').forEach((b) => b.classList.toggle('on', b.dataset.v === poolMode)); }
    $('mm-go').disabled = !poolOf(poolMode).length;
  }
  $('mm-pool').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; poolMode = b.dataset.v; store.set('sumiKanji.memoPool', poolMode); drawPool(); });

  // ---------- Hình học nét ----------
  const N = 24;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const refCache = {};
  function refStrokes(c) {
    if (refCache[c]) return refCache[c];
    const svg = $('mm-measure');
    const out = (data[c].p || []).map((p) => {
      const el = document.createElementNS(SVGNS, 'path');
      el.setAttribute('d', p[0]);
      svg.appendChild(el);
      const L = el.getTotalLength();
      const pts = [];
      for (let k = 0; k < N; k++) { const q = el.getPointAtLength(L * k / (N - 1)); pts.push([q.x, q.y]); }
      svg.removeChild(el);
      return { pts, len: L, d: p[0] };
    });
    return (refCache[c] = out);
  }
  function resample(pts, n) {
    if (pts.length < 2) return Array.from({ length: n }, () => pts[0] || [0, 0]);
    const seg = [0];
    for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = seg[seg.length - 1] || 1, out = [];
    let j = 1;
    for (let k = 0; k < n; k++) {
      const t = L * k / (n - 1);
      while (j < seg.length - 1 && seg[j] < t) j++;
      const a = pts[j - 1], b = pts[j], s = (t - seg[j - 1]) / ((seg[j] - seg[j - 1]) || 1);
      out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]);
    }
    return out;
  }
  function bbox(list) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((s) => s.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  const meanDist = (a, b) => a.reduce((s, p, k) => s + Math.hypot(p[0] - b[k][0], p[1] - b[k][1]), 0) / a.length;

  // So khớp chữ viết với chữ mẫu → trạng thái từng nét
  function grade(c, user) {
    const ref = refStrokes(c);
    const R = bbox(ref.map((r) => r.pts));
    const U = bbox(user);
    // đưa nét viết về cùng khung với chữ mẫu (bỏ qua viết to/nhỏ, lệch vị trí)
    const s = Math.max(R.w, R.h, 20) / Math.max(U.w, U.h, 8);
    const norm = user.map((st) => resample(st, N).map(([x, y]) => [R.cx + (x - U.cx) * s, R.cy + (y - U.cy) * s]));
    const TH = (r) => (r.len < 18 ? 17 : 14);
    const res = ref.map((r, i) => {
      const u = norm[i];
      if (!u) return { st: 'miss' };
      const fwd = meanDist(u, r.pts);
      const rev = meanDist(u.slice().reverse(), r.pts);
      if (fwd <= TH(r)) return { st: 'ok', d: fwd };
      if (rev <= TH(r)) return { st: 'rev', d: rev };
      // có khớp với nét khác không → sai thứ tự
      const alt = ref.findIndex((r2, j) => j !== i && meanDist(u, r2.pts) <= TH(r2));
      if (alt >= 0) return { st: 'order', alt };
      return { st: 'off', d: fwd };
    });
    const extra = Math.max(0, norm.length - ref.length);
    const ok = res.filter((x) => x.st === 'ok').length;
    const rate = ok / ref.length;
    const verdict = !extra && ok === ref.length ? 'perfect' : !extra && norm.length === ref.length && rate >= 0.7 ? 'near' : 'bad';
    return { res, extra, ok, total: ref.length, user: norm.length, verdict, norm };
  }

  // ---------- Canvas ----------
  const cv = $('mm-canvas');
  const ctx = cv.getContext('2d');
  let size = 320, dpr = 1;
  function sizePad() {
    const w = Math.min(360, $('mm-pad').parentElement.clientWidth - 8);
    size = Math.max(240, w);
    dpr = window.devicePixelRatio || 1;
    $('mm-pad').style.width = size + 'px'; $('mm-pad').style.height = size + 'px';
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener('resize', () => { if (!$('mm-play').hidden) sizePad(); });
  let strokes = [], cur = null, canDraw = false;
  const toK = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109]; };
  function redraw() {
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2b2522'; ctx.lineWidth = size / 30;
    const k = size / 109;
    strokes.concat(cur ? [cur] : []).forEach((st) => {
      ctx.beginPath();
      st.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      if (st.length === 1) ctx.lineTo(st[0][0] * k + 0.1, st[0][1] * k);
      ctx.stroke();
    });
    $('mm-strokes').textContent = canDraw || strokes.length ? 'Đã viết ' + strokes.length + ' nét' + (Q && Q.peeked ? ' · đã xem lại' : '') : '';
  }
  cv.addEventListener('pointerdown', (e) => { if (!canDraw) return; cur = [toK(e)]; cv.setPointerCapture(e.pointerId); redraw(); });
  cv.addEventListener('pointermove', (e) => { if (!cur) return; const p = toK(e); const l = cur[cur.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.8) { cur.push(p); redraw(); } });
  const end = () => { if (!cur) return; strokes.push(cur); cur = null; redraw(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // ---------- Vòng chơi ----------
  let G = null, Q = null;
  window.__sumiMemo = () => ({ G, Q, grade, refStrokes }); // hỗ trợ kiểm thử tự động
  function startRound() {
    const pool = poolOf(poolMode);
    const list = shuffle(pool).slice(0, ROUND);
    while (list.length < Math.min(ROUND, 5) && pool.length) list.push(pool[list.length % pool.length]);
    G = { list, i: 0, show: store.get('sumiKanji.memoShow', 3000), results: [] };
    $('mm-start').hidden = true; $('mm-end').hidden = true; $('mm-play').hidden = false;
    sizePad();
    nextQ();
  }
  function nextQ() {
    const c = G.list[G.i];
    Q = { c, peeked: false };
    strokes = []; cur = null; canDraw = false;
    $('top-prog').textContent = (G.i + 1) + '/' + G.list.length;
    $('mm-ask').innerHTML = '<span class="mm-hv">' + esc(hvOf(c)) + '</span><span class="mm-vi">' + esc(viOf(c)) + '</span><span class="mm-n">' + refStrokes(c).length + ' nét</span>';
    $('mm-result').hidden = true; $('mm-btns').hidden = false;
    flash(c, G.show, 'Nhớ kỹ hình chữ nhé…');
  }
  function flash(c, ms, msg) {
    canDraw = false;
    $('mm-show-k').textContent = c;
    $('mm-show').hidden = false;
    $('mm-show').dataset.msg = msg;
    const t = $('mm-timer');
    t.style.transition = 'none'; t.style.width = '100%'; void t.offsetWidth;
    t.style.transition = 'width ' + ms + 'ms linear'; t.style.width = '0%';
    setBtns(false);
    clearTimeout(flash.tm);
    flash.tm = setTimeout(() => { $('mm-show').hidden = true; canDraw = true; setBtns(true); redraw(); }, ms);
  }
  function setBtns(on) { ['mm-undo', 'mm-clear', 'mm-peek', 'mm-check'].forEach((id) => { $(id).disabled = !on; }); }
  $('mm-undo').onclick = () => { strokes.pop(); redraw(); };
  $('mm-clear').onclick = () => { strokes = []; redraw(); };
  $('mm-peek').onclick = () => { Q.peeked = true; strokes = []; flash(Q.c, 2000, 'Xem lại một lần nữa…'); };
  $('mm-check').onclick = () => {
    if (!strokes.length) { $('mm-check').classList.add('nudge'); setTimeout(() => $('mm-check').classList.remove('nudge'), 400); return; }
    const g = grade(Q.c, strokes);
    showResult(g);
  };

  const ST = { ok: ['#16a34a', 'đúng'], rev: ['#f97316', 'ngược chiều'], order: ['#a855f7', 'sai thứ tự'], off: ['#ef4444', 'lệch / sai hình'], miss: ['#ef4444', 'thiếu nét'] };
  function showResult(g) {
    canDraw = false;
    const c = Q.c;
    // chữ mẫu tô màu theo kết quả từng nét, kèm số thứ tự
    const ref = refStrokes(c);
    const refSvg = '<svg class="mm-ref" viewBox="0 0 109 109" aria-label="Chữ mẫu">' + ref.map((r, i) => '<path d="' + r.d + '" stroke="' + ST[g.res[i].st][0] + '"/>').join('') +
      (data[c].p || []).map((p, i) => p[1] != null ? '<text x="' + p[1] + '" y="' + p[2] + '" fill="' + ST[g.res[i].st][0] + '">' + (i + 1) + '</text>' : '').join('') + '</svg>';
    const score = g.verdict === 'perfect' && !Q.peeked ? 3 : g.verdict === 'perfect' || g.verdict === 'near' ? 2 : 0;
    G.results.push({ c, verdict: g.verdict, peeked: Q.peeked, ok: g.ok, total: g.total });
    // thời gian nhìn thích ứng
    if (score === 3) G.show = Math.max(1000, G.show - 500); else if (!score) G.show = Math.min(3000, G.show + 500);
    store.set('sumiKanji.memoShow', G.show);
    const issues = [];
    g.res.forEach((x, i) => { if (x.st !== 'ok') issues.push('Nét ' + (i + 1) + ': ' + ST[x.st][1] + (x.st === 'order' ? ' (giống nét ' + (x.alt + 1) + ')' : '')); });
    if (g.extra) issues.push('Thừa ' + g.extra + ' nét');
    if (g.user < g.total) issues.unshift('Bạn viết ' + g.user + '/' + g.total + ' nét');
    const head = g.verdict === 'perfect' ? '<b class="v ok">○ せいかい！ Đúng cả ' + g.total + ' nét' + (Q.peeked ? ' (đã xem lại)' : '') + '</b>'
      : g.verdict === 'near' ? '<b class="v near">△ Gần đúng: ' + g.ok + '/' + g.total + ' nét chuẩn</b>'
        : '<b class="v bad">× Chưa đúng: ' + g.ok + '/' + g.total + ' nét chuẩn</b>';
    const last = G.i + 1 >= G.list.length;
    $('mm-result').innerHTML = head +
      '<div class="mm-rrow">' + refSvg + '<div class="mm-rinfo">' +
      '<div class="mm-legend">' + Object.keys(ST).filter((k) => k !== 'miss').map((k) => '<span style="--c:' + ST[k][0] + '">' + ST[k][1] + '</span>').join('') + '</div>' +
      (issues.length ? '<ul>' + issues.slice(0, 5).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '<p>Thứ tự và hướng nét đều chuẩn. Giỏi lắm!</p>') + '</div></div>' +
      '<div class="mm-rbtns">' + (g.verdict !== 'perfect' ? '<button class="act-btn" id="mm-retry">↺ Viết lại chữ này</button>' : '') +
      '<button class="act-btn primary" id="mm-next">' + (last ? 'Xem kết quả →' : 'Chữ tiếp →') + '</button></div>';
    $('mm-result').hidden = false; $('mm-btns').hidden = true;
    if ($('mm-retry')) $('mm-retry').onclick = () => { G.results.pop(); strokes = []; $('mm-result').hidden = true; $('mm-btns').hidden = false; Q.peeked = true; flash(c, 2000, 'Xem lại rồi viết lần nữa…'); };
    $('mm-next').onclick = () => { if (last) finish(); else { G.i++; nextQ(); } };
    $('mm-next').focus();
  }

  function finish() {
    $('mm-play').hidden = true;
    const r = G.results;
    const perfect = r.filter((x) => x.verdict === 'perfect' && !x.peeked).length;
    const okish = r.filter((x) => x.verdict !== 'bad').length;
    const xp = okish ? Sumi.addXP(Math.min(20, perfect * 2 + (okish - perfect))) : null;
    const weak = r.filter((x) => x.verdict === 'bad' || x.peeked).map((x) => x.c);
    $('mm-end').innerHTML = HIYO.svg(currentForm(), perfect >= r.length * 0.8 ? 'joy' : 'cheer', { cls: 'mm-hiyo' }) +
      '<h1>' + (perfect === r.length ? '💮 はなまる！' : 'Hoàn thành!') + '</h1>' +
      '<p class="mm-sum">Viết chuẩn <b>' + perfect + '/' + r.length + '</b> chữ · gần đúng ' + (okish - perfect) + ' · thời gian nhìn lần sau: <b>' + (G.show / 1000) + ' giây</b></p>' +
      '<div class="mm-grid">' + r.map((x) => '<span class="' + x.verdict + (x.peeked ? ' peek' : '') + '" title="' + x.ok + '/' + x.total + ' nét"><b>' + x.c + '</b><small>' + (x.verdict === 'perfect' ? (x.peeked ? '○ xem lại' : '○') : x.verdict === 'near' ? '△' : '×') + '</small></span>').join('') + '</div>' +
      (weak.length ? '<p class="mm-weak">Cần luyện thêm: ' + weak.map((c) => '<a href="level.html?id=' + (gradeLevelOf(c) || levelId) + '&k=' + encodeURIComponent(c) + '">' + c + '</a>').join(' ') + '</p>' : '') +
      '<div class="mm-rbtns"><button class="act-btn primary" id="mm-again">↺ 10 chữ mới</button><a class="act-btn" href="level.html?id=' + levelId + '">🗺 Về ' + esc(levelName) + '</a></div>';
    $('mm-end').hidden = false;
    $('mm-again').onclick = startRound;
    if (xp && xp.goalJustMet && window.sumiGoalCelebrate) sumiGoalCelebrate(xp);
  }

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  document.title = 'Nhìn rồi viết – ' + levelName + ' – Sumi Kanji';
  $('mm-start-hiyo').innerHTML = HIYO.svg(currentForm(), 'think', { cls: 'mm-hiyo' });
  $('mm-go').onclick = startRound;
  $('mm-go').disabled = true;
  sumiLoadLevel(levelId).then((d) => { data = d; drawPool(); })
    .catch((err) => { $('mm-start').querySelector('p').textContent = err.message; });
})();
