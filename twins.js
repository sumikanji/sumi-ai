/*! © 2026 Sumi Kanji */
// ===== Chữ sinh đôi: phân biệt các chữ Hán trông na ná nhau =====
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
  const GROUPS = (window.SUMI_TWINS || []).map((g) => Object.assign({}, g, { chars: Array.from(g.c) }));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const ROUND = 10;
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c, g) => (g && g.label && g.label[c]) || (IDX[c] ? IDX[c][1].split(/[;,]/)[0].trim() : '');

  // ---------- Chữ & nhóm ----------
  let poolMode = store.get('sumiKanji.twinPool', 'learned');
  function poolOf(v) {
    const chars = levelChars(levelId);
    if (v === 'learned') { const l = loadLearned(); return chars.filter((c) => l[c]); }
    if (v === 'fav') return chars.filter((c) => SumiFav.has(c));
    return P ? chars.filter((c) => P.charOpen(levelId, c)) : chars;
  }
  // Nhóm có ít nhất một chữ trong phạm vi; nếu ít quá thì thêm chữ đã học ở các cấp khác
  function groupsFor(v) {
    let set = new Set(poolOf(v));
    let gs = GROUPS.filter((g) => g.chars.some((c) => set.has(c)));
    if (gs.length < 3 && v !== 'fav' && set.size) {
      const l = loadLearned();
      Object.keys(l).forEach((c) => set.add(c));
      gs = GROUPS.filter((g) => g.chars.some((c) => set.has(c)));
    }
    return { gs, set };
  }
  function drawPool() {
    document.querySelectorAll('#tw-pool button').forEach((b) => {
      const n = groupsFor(b.dataset.v).gs.length;
      b.querySelector('small').textContent = n + ' nhóm';
      b.disabled = n < 1;
      b.classList.toggle('on', b.dataset.v === poolMode);
    });
    if (!groupsFor(poolMode).gs.length) { const ok = ['learned', 'fav', 'open'].find((v) => groupsFor(v).gs.length); if (ok) { poolMode = ok; document.querySelectorAll('#tw-pool button').forEach((b) => b.classList.toggle('on', b.dataset.v === poolMode)); } }
    const n = groupsFor(poolMode).gs.length;
    $('tw-go').disabled = !n;
    $('tw-note').textContent = n ? 'Có ' + n + ' nhóm chữ dễ nhầm liên quan đến các chữ bạn chọn.' : 'Chưa có nhóm chữ dễ nhầm nào cho phạm vi này. Hãy học thêm vài chữ nhé!';
  }
  $('tw-pool').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; poolMode = b.dataset.v; store.set('sumiKanji.twinPool', poolMode); drawPool(); });

  // ---------- Câu hỏi ----------
  let G = null;
  window.__sumiTwins = () => G; // hỗ trợ kiểm thử tự động
  function makeQs() {
    const { gs, set } = groupsFor(poolMode);
    const order = [];
    while (order.length < ROUND) order.push(...shuffle(gs));
    return order.slice(0, ROUND).map((g) => {
      const inPool = g.chars.filter((c) => set.has(c) && IDX[c]);
      const target = shuffle(inPool.length ? inPool : g.chars.filter((c) => IDX[c]))[0];
      const type = Math.random() < 0.6 ? 'pick' : 'mean';
      return { g, target, type, opts: shuffle(g.chars) };
    });
  }
  function start() {
    G = { qs: makeQs(), i: 0, res: [], answered: false };
    $('tw-start').hidden = true; $('tw-end').hidden = true; $('tw-play').hidden = false;
    drawQ();
  }
  function drawQ() {
    const q = G.qs[G.i];
    G.answered = false;
    $('top-prog').textContent = (G.i + 1) + '/' + G.qs.length;
    $('tw-reveal').hidden = true;
    if (q.type === 'pick') {
      $('tw-q').innerHTML = '<span class="tw-kind">Chọn đúng chữ</span><div class="tw-ask">Chữ nào nghĩa là <b>“' + esc(viOf(q.target, q.g)) + '”</b>' + (hvOf(q.target) ? ' <span class="tw-hv">(' + esc(hvOf(q.target)) + ')</span>' : '') + '?</div>';
      $('tw-opts').className = 'tw-opts big n' + q.opts.length;
      $('tw-opts').innerHTML = q.opts.map((c) => '<button class="tw-opt" data-c="' + c + '"><b>' + c + '</b></button>').join('');
    } else {
      $('tw-q').innerHTML = '<span class="tw-kind">Chữ này nghĩa là gì?</span><div class="tw-show">' + q.target + '</div>';
      $('tw-opts').className = 'tw-opts txt';
      $('tw-opts').innerHTML = q.opts.map((c) => '<button class="tw-opt" data-c="' + c + '"><span>' + esc(viOf(c, q.g)) + '</span>' + (hvOf(c) ? '<small>' + esc(hvOf(c)) + '</small>' : '') + '</button>').join('');
    }
  }
  $('tw-opts').addEventListener('click', (e) => {
    const b = e.target.closest('.tw-opt'); if (!b || G.answered) return;
    G.answered = true;
    const q = G.qs[G.i];
    const ok = b.dataset.c === q.target;
    G.res.push({ q, ok, pick: b.dataset.c });
    if (ok) Sumi.addXP(Sumi.XP.quiz);
    document.querySelectorAll('.tw-opt').forEach((x) => {
      x.disabled = true;
      if (x.dataset.c === q.target) x.classList.add('right');
      else if (x === b) x.classList.add('wrong');
    });
    reveal(q, ok, b.dataset.c);
  });
  function reveal(q, ok, pick) {
    const last = G.i + 1 >= G.qs.length;
    $('tw-reveal').innerHTML =
      '<div class="tw-say">' + HIYO.svg(currentForm(), ok ? 'joy' : 'think', { cls: 'tw-hiyo' }) +
        '<b class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '○ せいかい！' : '× Nhầm rồi! Bạn chọn 「' + pick + '」') + '</b></div>' +
      '<div class="tw-family">' + q.g.chars.map((c) => '<div class="tw-m' + (c === q.target ? ' t' : '') + (c === pick && !ok ? ' p' : '') + '"><b>' + c + '</b><span>' + esc(hvOf(c) || '—') + '</span><small>' + esc(viOf(c, q.g)) + '</small></div>').join('') + '</div>' +
      '<p class="tw-tip"><b>Mẹo phân biệt:</b> ' + esc(q.g.tip) + '</p>' +
      '<button class="act-btn primary" id="tw-next">' + (last ? 'Xem kết quả →' : 'Câu tiếp →') + '</button>';
    $('tw-reveal').hidden = false;
    $('tw-next').onclick = () => { if (last) finish(); else { G.i++; drawQ(); } };
    $('tw-next').focus({ preventScroll: true });
    setTimeout(() => $('tw-reveal').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
  document.addEventListener('keydown', (e) => {
    if ($('tw-play').hidden || !G) return;
    if (!G.answered && /^[1-6]$/.test(e.key)) { const b = document.querySelectorAll('.tw-opt')[Number(e.key) - 1]; if (b) b.click(); }
    else if (G.answered && e.key === 'Enter') { e.preventDefault(); $('tw-next').click(); }
  });

  function finish() {
    $('tw-play').hidden = true;
    const ok = G.res.filter((r) => r.ok).length;
    const wrongGroups = [];
    G.res.filter((r) => !r.ok).forEach((r) => { if (!wrongGroups.includes(r.q.g)) wrongGroups.push(r.q.g); });
    const best = store.get('sumiKanji.twinBest', {});
    if (ok > (best[levelId] || 0)) { best[levelId] = ok; store.set('sumiKanji.twinBest', best); }
    $('tw-end').innerHTML = HIYO.svg(currentForm(), ok >= 9 ? 'joy' : 'cheer', { cls: 'tw-hiyo big' }) +
      '<h1>' + (ok === G.res.length ? '💮 はなまる！' : ok >= 7 ? 'Mắt tinh lắm!' : 'Cố lên nhé!') + '</h1>' +
      '<div class="tw-score">' + ok + '<small>/' + G.res.length + '</small></div>' +
      '<p>' + (wrongGroups.length ? 'Xem lại các cặp hay nhầm bên dưới, rồi chơi lại để khắc sâu hơn.' : 'Bạn phân biệt được hết các chữ na ná. Tuyệt vời!') + '</p>' +
      (wrongGroups.length ? '<div class="tw-review">' + wrongGroups.map((g) => '<div class="tw-rv"><div class="tw-rv-k">' + g.chars.map((c) => '<span><b>' + c + '</b><small>' + esc(viOf(c, g)) + '</small></span>').join('') + '</div><p>' + esc(g.tip) + '</p></div>').join('') + '</div>' : '') +
      '<div class="tw-acts"><button class="act-btn primary" id="tw-again">↺ Chơi lại</button><a class="act-btn" href="level.html?id=' + levelId + '">🗺 Về ' + esc(levelName) + '</a></div>';
    $('tw-end').hidden = false;
    $('tw-again').onclick = start;
  }

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  document.title = 'Chữ sinh đôi – ' + levelName + ' – Sumi Kanji';
  $('tw-start-hiyo').innerHTML = HIYO.svg(currentForm(), 'wow', { cls: 'tw-hiyo big' });
  $('tw-go').onclick = start;
  drawPool();
})();
