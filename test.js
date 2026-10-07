// ===== Bài kiểm tra theo lộ trình: Kiểm tra màn · Kiểm tra giữa cấp (50 câu) · Thi tổng hợp =====
(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const levelId = LEVELS[params.get('level')] ? params.get('level') : null;
  if (!levelId) { location.href = 'index.html'; return; }
  const P = window.SumiPath;
  if (P && !P.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }
  const stageNo = Number(params.get('stage')) || 0;
  const nParam = stageNo ? 'stage' : params.get('n') === 'mid' ? 'mid' : 'all';
  const MID_SIZE = 50;
  const level = LEVELS[levelId];
  const testKey = stageNo ? levelId + ':s' + stageNo : levelId + ':' + nParam;
  const isGate = nParam === 'all';
  const stageInfo = () => (stageNo && P ? P.stageInfo(levelId)[stageNo - 1] : null);
  const SESSION_KEY = 'sumiKanji.testSession';
  const PREF_KEY = 'sumiKanji.testPrefs';
  const PASS = 80;
  const KIND_NAME = { mid: '中間テスト · Kiểm tra giữa cấp', all: 'まとめテスト · Thi tổng hợp', stage: 'Kiểm tra màn ' + stageNo };
  const levelName = level.title.split(' (')[0];
  const ICON = { stage: '⚔️ ', mid: '📝 ', all: '🏯 ' };

  const IDX = window.SUMI_INDEX || {};
  const data = {};
  let chars = [];

  // ---------- Tiện ích ----------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const isKanji = (ch) => /[一-鿿々]/.test(ch);
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const toHira = (s) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  const prefs = Object.assign({ write: 'hand' }, store.get(PREF_KEY, {}));
  prefs.pool = 'all'; // bài kiểm tra theo lộ trình luôn tính toàn bộ chữ

  function show(id) {
    ['screen-start', 'screen-quiz', 'screen-end'].forEach((s) => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function updateXP() { $('top-xp').textContent = '⭐ ' + Sumi.todayXP() + ' / ' + Sumi.load().goal; }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(new Error('Không tải được ' + src));
      document.head.appendChild(s);
    });
  }

  // ---------- Tạo câu hỏi ----------
  // Tìm câu ví dụ có từ chứa chữ c (đoạn có furigana)
  function sentencesWith(c) {
    const d = data[c];
    const out = [];
    (d.sn || []).forEach((s, si) => {
      const j = s[0].findIndex((sg) => typeof sg !== 'string' && sg[0].includes(c));
      if (j >= 0) out.push({ si, j });
    });
    return out;
  }

  // Biến đổi cách đọc thành phương án nhiễu hay gặp (trường âm, っ, dấu ゛, âm ghép)
  const DAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
  const UNDAKU = Object.fromEntries(Object.entries(DAKU).map(([a, b]) => [b, a]));
  const ROW_O = 'おこごそぞとどのほぼぽもよろょ';
  function mutations(r) {
    const out = new Set();
    const a = Array.from(r);
    // dấu ゛ ở chữ đầu
    if (DAKU[a[0]]) out.add(DAKU[a[0]] + a.slice(1).join(''));
    else if (UNDAKU[a[0]] && UNDAKU[a[0]] !== 'ち' && UNDAKU[a[0]] !== 'つ') out.add(UNDAKU[a[0]] + a.slice(1).join(''));
    // trường âm う
    const ui = a.findIndex((ch, i) => ch === 'う' && i > 0 && ROW_O.includes(a[i - 1]));
    if (ui > 0) out.add(a.slice(0, ui).join('') + a.slice(ui + 1).join(''));
    else {
      const oi = a.findIndex((ch, i) => ROW_O.includes(ch) && i < a.length - 1 && a[i + 1] !== 'う');
      if (oi >= 0 && a.length >= 2) out.add(a.slice(0, oi + 1).join('') + 'う' + a.slice(oi + 1).join(''));
    }
    // âm ngắt っ
    const ti = a.indexOf('っ');
    if (ti >= 0) out.add(a.slice(0, ti).join('') + a.slice(ti + 1).join(''));
    else if (a.length >= 3) out.add(a.slice(0, 1).join('') + 'っ' + a.slice(1).join(''));
    // âm ghép nhỏ ゃゅょ
    const SM = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' };
    const si = a.findIndex((ch, i) => i > 0 && SM[ch]);
    if (si > 0) out.add(a.slice(0, si).join('') + SM[a[si]] + a.slice(si + 1).join(''));
    out.delete(r);
    return Array.from(out);
  }

  function readingOptions(c, read) {
    const muts = shuffle(mutations(read)).slice(0, 2);
    const others = [];
    for (const x of shuffle(chars)) {
      if (x === c || !data[x]) continue;
      for (const s of data[x].sn || []) {
        for (const sg of s[0]) {
          if (typeof sg === 'string') continue;
          if (sg[1] !== read && Math.abs(sg[1].length - read.length) <= 1 && !muts.includes(sg[1]) && !others.includes(sg[1])) { others.push(sg[1]); break; }
        }
        if (others.length >= 3) break;
      }
      if (others.length >= 3) break;
    }
    const opts = [read].concat(muts);
    for (const o of others) { if (opts.length >= 4) break; if (!opts.includes(o)) opts.push(o); }
    return shuffle(opts.slice(0, 4));
  }

  // Phương án nhiễu cho câu viết: thay chữ đích bằng chữ đồng âm / cùng bộ
  function writeOptions(c, word) {
    const d = data[c];
    const ons = new Set((d.on || []).map(toHira));
    const same = [], rad = [], rest = [];
    for (const x of Object.keys(data)) {
      if (x === c || word.includes(x)) continue;
      const dx = data[x];
      if ((dx.on || []).some((o) => ons.has(toHira(o)))) same.push(x);
      else if (d.r && dx.r && dx.r[0] === d.r[0]) rad.push(x);
      else rest.push(x);
    }
    const subs = shuffle(same).slice(0, 2);
    for (const x of shuffle(rad).concat(shuffle(rest))) { if (subs.length >= 3) break; subs.push(x); }
    return shuffle([word].concat(subs.map((x) => word.split(c).join(x))));
  }

  function buildQuestion(c, kind) {
    const d = data[c];
    const ss = sentencesWith(c);
    let q;
    if (ss.length) {
      const { si, j } = pick(ss);
      const seg = d.sn[si][0][j];
      q = { c, k: kind, si, j, word: seg[0], read: seg[1] };
    } else {
      const w = (d.w || []).find((x) => x[0].includes(c)) || [c, toHira((d.on[0] || '').replace(/[.-]/g, ''))];
      q = { c, k: kind, word: w[0], read: w[1] };
    }
    if (q.k === 'r') q.opts = readingOptions(c, q.read);
    else q.opts = writeOptions(c, q.word);
    return q;
  }

  function sentenceHtml(q, reveal) {
    const d = data[q.c];
    if (q.si == null) {
      return q.k === 'r' && !reveal ? '<span class="tgt-r">' + esc(q.word) + '</span>'
        : q.k === 'w' && !reveal ? '<span class="tgt-w">' + esc(q.read) + '</span>'
          : '<ruby class="tgt-done">' + esc(q.word) + '<rt>' + esc(q.read) + '</rt></ruby>';
    }
    return d.sn[q.si][0].map((sg, idx) => {
      if (typeof sg === 'string') return esc(sg);
      if (idx === q.j) {
        if (reveal) return '<ruby class="tgt-done">' + esc(sg[0]) + '<rt>' + esc(sg[1]) + '</rt></ruby>';
        return q.k === 'r' ? '<span class="tgt-r">' + esc(sg[0]) + '</span>' : '<span class="tgt-w">' + esc(sg[1]) + '</span>';
      }
      return '<ruby>' + esc(sg[0]) + '<rt>' + esc(sg[1]) + '</rt></ruby>';
    }).join('');
  }

  // Phần kana đi liền sau chữ (okurigana) để hiện bên cạnh ô viết
  function okuriAfter(q) {
    if (q.si == null) return '';
    const next = data[q.c].sn[q.si][0][q.j + 1];
    if (typeof next !== 'string') return '';
    const m = next.match(/^[ぁ-ゟ]+/);
    return m ? m[0].slice(0, 4) : '';
  }

  // ---------- Trạng thái bài làm ----------
  let S = null;
  window.__sumiTestState = () => S; // hỗ trợ kiểm thử tự động // { key, qs, i, res, write, startedAt, used }

  function saveSession() { store.set(SESSION_KEY, S); }

  // ---------- Xoay vòng: mỗi chữ ra đủ 1 lần rồi mới lặp lại ----------
  // Bộ đề theo cấp + phạm vi, dùng chung cho bài 10 câu và 50 câu.
  const DECK_KEY = 'sumiKanji.testDeck';
  const deckKey = () => levelId + ':' + prefs.pool;
  function getDeck(pool) {
    const all = store.get(DECK_KEY, {});
    const d = Object.assign({ done: [], round: 1, again: [] }, all[deckKey()] || {});
    const inPool = new Set(pool);
    d.done = d.done.filter((c) => inPool.has(c));
    d.again = d.again.filter((c) => inPool.has(c));
    return d;
  }
  function putDeck(d) {
    const all = store.get(DECK_KEY, {});
    all[deckKey()] = d;
    store.set(DECK_KEY, all);
  }

  // Chọn chữ cho bài: tối đa 30% là chữ sai lần trước, còn lại lấy chữ chưa ra trong vòng này
  function planPick(pool, size) {
    const d = getDeck(pool);
    const done = new Set(d.done);
    const again = shuffle(d.again).slice(0, Math.floor(size * 0.3));
    const taken = new Set(again);
    const fresh = shuffle(pool.filter((c) => !done.has(c) && !taken.has(c)));
    const fromOld = fresh.slice(0, size - again.length);
    fromOld.forEach((c) => taken.add(c));
    let fromNew = [];
    if (again.length + fromOld.length < size) {
      // Hết vòng: bắt đầu vòng mới với các chữ còn lại
      fromNew = shuffle(pool.filter((c) => !taken.has(c))).slice(0, size - again.length - fromOld.length);
    }
    return { picked: shuffle(again.concat(fromOld, fromNew)), again, fromOld, fromNew, wrapped: fromNew.length > 0 };
  }

  function applyPlan(plan, wrong) {
    const pool = poolChars();
    const d = getDeck(pool);
    if (plan) {
      if (plan.wrapped) { d.round += 1; d.done = plan.fromNew.slice(); }
      else d.done = Array.from(new Set(d.done.concat(plan.fromOld)));
      if (d.done.length >= pool.length) { d.round += 1; d.done = []; }
      const asked = new Set(plan.picked);
      d.again = d.again.filter((c) => !asked.has(c));
    }
    d.again = Array.from(new Set(d.again.concat(wrong)));
    putDeck(d);
  }

  function startNew(pool, retryOf) {
    let picked, kinds, plan = null;
    if (retryOf) { picked = pool.slice(); kinds = shuffle(picked.map((_, i) => (i % 2 ? 'w' : 'r'))); }
    else if (nParam === 'mid') {
      // 50 câu: nếu nửa cấp ít hơn 50 chữ, một số chữ được hỏi thêm câu thứ hai (đổi đọc ↔ viết)
      const first = shuffle(pool).slice(0, MID_SIZE);
      const k1 = shuffle(first.map((_, i) => (i % 2 ? 'w' : 'r')));
      const extra = shuffle(first.map((c, i) => [c, k1[i] === 'r' ? 'w' : 'r'])).slice(0, Math.max(0, MID_SIZE - first.length));
      const all = shuffle(first.map((c, i) => [c, k1[i]]).concat(extra));
      // tránh 2 câu cùng chữ đứng liền nhau
      for (let i = 1; i < all.length; i++) if (all[i][0] === all[i - 1][0]) { const j = (i + 2) % all.length; [all[i], all[j]] = [all[j], all[i]]; }
      picked = all.map((x) => x[0]); kinds = all.map((x) => x[1]);
    } else { picked = shuffle(pool); kinds = shuffle(picked.map((_, i) => (i % 2 ? 'w' : 'r'))); }
    S = {
      key: testKey, retry: !!retryOf, write: prefs.write, plan,
      qs: picked.map((c, i) => buildQuestion(c, kinds[i])),
      i: 0, res: [], used: 0, startedAt: Date.now()
    };
    if (!S.retry) saveSession();
    beginQuiz();
  }

  let segStart = 0;
  function beginQuiz() {
    show('screen-quiz');
    segStart = Date.now();
    $('t-pause').hidden = S.retry;
    renderQ();
  }

  // ---------- Hiển thị câu hỏi ----------
  let answered = false;
  let pendingGoal = null;

  function renderQ() {
    const q = S.qs[S.i];
    answered = false;
    $('feedback').hidden = true;
    $('meta-left').textContent = 'Câu ' + (S.i + 1) + ' / ' + S.qs.length;
    const ok = S.res.filter(Boolean).length;
    $('meta-right').innerHTML = '<span class="mark-o">○ ' + ok + '</span> <span class="mark-x">× ' + (S.res.length - ok) + '</span>';
    $('bar-fill').style.width = (S.i / S.qs.length * 100) + '%';
    $('q-card').className = 'q-card t-card kind-' + q.k;
    $('t-no').textContent = '問 ' + (S.i + 1);
    if (q.k === 'r') {
      $('t-kind').textContent = '読み';
      $('q-label').textContent = 'Chọn cách đọc đúng của phần gạch chân.';
    } else {
      $('t-kind').textContent = '書き';
      $('q-label').textContent = S.write === 'hand' ? 'Viết chữ Hán cho phần in đậm vào ô.' : 'Chọn cách viết chữ Hán đúng cho phần in đậm.';
    }
    $('t-sent').innerHTML = sentenceHtml(q, false);
    const d = data[q.c];
    const s = q.si != null ? d.sn[q.si] : null;
    $('t-tr').innerHTML = s ? esc(s[1]) + (s[2] ? '<span class="en">' + esc(s[2]) + '</span>' : '') : '';

    const hand = q.k === 'w' && S.write === 'hand';
    $('hand').hidden = !hand;
    $('options').hidden = hand;
    $('options').style.display = hand ? 'none' : '';
    if (hand) setupHand(q);
    else {
      $('options').className = 'options' + (q.k === 'w' ? ' word-opts' : ' read-opts');
      $('options').innerHTML = q.opts.map((o, i) =>
        '<button class="opt" data-key="' + esc(o) + '"><span class="opt-num">' + (i + 1) + '</span><span class="' +
        (q.k === 'w' ? 'opt-kanji' : 'opt-read') + '">' + esc(o) + '</span></button>').join('');
    }
  }

  $('options').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b || answered) return;
    const q = S.qs[S.i];
    const right = q.k === 'r' ? q.read : q.word;
    const ok = b.dataset.key === right;
    document.querySelectorAll('#options .opt').forEach((x) => {
      x.disabled = true;
      if (x.dataset.key === right) x.classList.add('right');
      else if (x === b) x.classList.add('wrong');
    });
    record(ok);
  });

  // ---------- Viết tay ----------
  const cv = $('hand-canvas');
  const ctx = cv.getContext('2d');
  let drawing = false, drawn = false, last = null;

  function setupHand(q) {
    const n = Array.from(q.word).filter(isKanji).length || 1;
    const cells = $('hand-cells');
    cells.style.setProperty('--n', n);
    cells.innerHTML = '<div class="hc-read">' + esc(q.read) + '</div>' +
      Array.from({ length: n }).map(() => '<div class="hc"></div>').join('');
    $('hand-okuri').textContent = '';
    $('hand-actions').hidden = false;
    $('hand-judge').hidden = true;
    requestAnimationFrame(sizeCanvas);
    drawn = false;
  }
  function sizeCanvas() {
    const box = $('hand-cells');
    const cells = box.querySelectorAll('.hc');
    const first = cells[0], lastCell = cells[cells.length - 1];
    const w = lastCell.offsetLeft + lastCell.offsetWidth - first.offsetLeft;
    const h = first.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.style.left = first.offsetLeft + 'px'; cv.style.top = first.offsetTop + 'px';
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2b2522';
    ctx.lineWidth = Math.max(4, h / 22);
  }
  window.addEventListener('resize', () => { if (!$('hand').hidden && !drawn) sizeCanvas(); });
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    if (answered) return;
    drawing = true; drawn = true; last = pos(e);
    cv.setPointerCapture(e.pointerId);
    ctx.beginPath(); ctx.arc(last[0], last[1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = '#2b2522'; ctx.fill();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, () => { drawing = false; }));
  $('hand-clear').addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); drawn = false; });
  $('hand-skip').addEventListener('click', () => { if (!answered) { revealHand(); record(false); } });
  $('hand-check').addEventListener('click', () => {
    if (!drawn) { $('hand-check').classList.add('nudge'); setTimeout(() => $('hand-check').classList.remove('nudge'), 500); return; }
    revealHand();
  });
  function revealHand() {
    const q = S.qs[S.i];
    $('hand-actions').hidden = true;
    $('hj-answer').innerHTML = '<span class="hj-label">Đáp án</span><span class="hj-word">' +
      Array.from(q.word).map((ch) => ch === q.c ? '<mark>' + ch + '</mark>' : esc(ch)).join('') +
      '</span><span class="hj-read">' + esc(q.read) + '</span>';
    $('hand-judge').hidden = false;
    $('hand-judge').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('hj-ok').addEventListener('click', () => { if (!answered) record(true); });
  $('hj-bad').addEventListener('click', () => { if (!answered) record(false); });

  // ---------- Ghi kết quả ----------
  function record(ok) {
    answered = true;
    const q = S.qs[S.i];
    S.res.push(ok);
    if (!S.retry) {
      if (ok) {
        const r = Sumi.addXP(Sumi.XP.quiz);
        if (r.goalJustMet) pendingGoal = r;
      }
      S.used += Date.now() - segStart; segStart = Date.now();
      S.i++;
      saveSession();
      S.i--;
    }
    updateXP();
    $('hand-judge').hidden = true;
    $('t-sent').innerHTML = sentenceHtml(q, true);
    $('q-card').classList.add(ok ? 'flash-ok' : 'shake');
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    $('fb-mascot').innerHTML = mascotSvg(ok ? 'cheer' : 'oops', 'fb-svg');
    $('fb-verdict').className = 'fb-verdict ' + (ok ? 'ok' : 'bad');
    $('fb-verdict').textContent = ok ? '○ せいかい！ Chính xác' : '× ざんねん… Chưa đúng';
    $('fb-stage').innerHTML = ok && !S.retry ? '<span class="xp-pop">+1⭐</span>' : '';
    $('fb-info').innerHTML = infoHtml(q);
    $('next-btn').textContent = S.i + 1 >= S.qs.length ? 'Xem kết quả →' : 'Câu tiếp →';
    setTimeout(() => fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
    $('next-btn').focus({ preventScroll: true });
  }

  function infoHtml(q) {
    const c = q.c, d = data[c];
    let h = '<div class="fb-main"><span class="fb-kanji">' + c + '</span><div><div class="fb-hv">' + esc(hvOf(c)) +
      '</div><div class="fb-vi">' + esc(d.vi) + '</div><div class="fb-en">' + esc(d.en || '') + '</div></div></div>';
    const w = (d.w || []).find((x) => x[0] === q.word);
    h += '<div class="fb-row"><b class="jp">' + esc(q.word) + '</b> <span class="jp">' + esc(q.read) + '</span>' +
      (w ? ' — ' + esc(w[3]) + (w[4] ? ' <span class="en">· ' + esc(w[4]) + '</span>' : '') : '') + '</div>';
    if (d.o && d.o[2]) h += '<div class="fb-row fb-origin"><b>なりたち</b> ' + esc(d.o[2]) + '</div>';
    const lv = gradeLevelOf(c);
    if (lv) h += '<a class="fb-link" href="level.html?id=' + lv + '&k=' + encodeURIComponent(c) + '">📖 Xem lại cách học chữ này</a>';
    return h;
  }

  function next() {
    if (!answered) return;
    if (pendingGoal) { const r = pendingGoal; pendingGoal = null; sumiGoalCelebrate(r, next); return; }
    S.i++;
    if (S.i >= S.qs.length) return finish();
    renderQ();
  }
  $('next-btn').addEventListener('click', next);

  $('t-pause').addEventListener('click', () => {
    if (answered) { S.i++; }
    S.used += Date.now() - segStart;
    if (S.i >= S.qs.length) return finish();
    saveSession();
    location.href = 'level.html?id=' + levelId;
  });

  document.addEventListener('keydown', (e) => {
    if ($('screen-quiz').hidden || e.target.tagName === 'SELECT') return;
    const q = S && S.qs[S.i];
    if (!q) return;
    if (!answered && !$('options').hidden && /^[1-4]$/.test(e.key)) {
      const b = document.querySelectorAll('#options .opt')[Number(e.key) - 1];
      if (b) b.click();
    } else if (!answered && !$('hand-judge').hidden && (e.key === '1' || e.key === '2')) {
      record(e.key === '1');
    } else if (!answered && !$('hand').hidden && $('hand-judge').hidden && e.key === 'Enter') {
      $('hand-check').click();
    } else if (answered && e.key === 'Enter') {
      e.preventDefault(); next();
    }
  });

  // ---------- Kết quả ----------
  function finish() {
    const total = S.qs.length;
    const ok = S.res.filter(Boolean).length;
    const score = Math.round(ok / total * 100);
    const mins = Math.max(1, Math.round((S.used + (Date.now() - segStart)) / 60000));
    let isBest = false;
    if (!S.retry) {
      store.del(SESSION_KEY);
      applyPlan(S.plan, S.qs.filter((q, i) => !S.res[i]).map((q) => q.c));
      isBest = Sumi.saveTest(testKey, score, ok, total).isBest;
    }
    const pathMsg = S.retry || !P ? null : pathResult(score);
    show('screen-end');
    $('paper-title').textContent = KIND_NAME[nParam] + (S.retry ? ' – làm lại câu sai' : '');
    $('paper-sub').textContent = levelName + ' · ' + total + ' câu · khoảng ' + mins + ' phút';
    $('t-score').innerHTML = '<b>' + score + '</b><span>点</span>';
    let stamp;
    if (score === 100) stamp = ['hanamaru', '💮 はなまる！', 'Điểm tuyệt đối! Bạn nắm chắc toàn bộ chữ.'];
    else if (score >= PASS) stamp = ['pass', '◎ ごうかく', 'Đạt! Ôn thêm vài chữ sai là hoàn hảo.'];
    else if (score >= 60) stamp = ['near', '○ もうすこし', 'Gần đạt rồi. Xem lại các chữ sai rồi làm lại nhé.'];
    else stamp = ['try', 'がんばろう！', 'Cần ôn thêm. Học lại các chữ sai rồi thử lần nữa.'];
    $('t-stamp').className = 't-stamp ' + stamp[0];
    $('t-stamp').innerHTML = '<span>' + stamp[1] + '</span><small>' + stamp[2] + '</small>';
    const rec = Sumi.testResult(testKey);
    $('end-stats').innerHTML =
      '<div class="stat"><b>' + ok + '/' + total + '</b><span>Câu đúng</span></div>' +
      '<div class="stat"><b>' + S.qs.filter((q, i) => q.k === 'r' && S.res[i]).length + '/' + S.qs.filter((q) => q.k === 'r').length + '</b><span>読み – Đọc</span></div>' +
      '<div class="stat"><b>' + S.qs.filter((q, i) => q.k === 'w' && S.res[i]).length + '/' + S.qs.filter((q) => q.k === 'w').length + '</b><span>書き – Viết</span></div>' +
      (rec && !S.retry ? '<div class="stat"><b>' + rec.best + '</b><span>' + (isBest && rec.n > 1 ? '🎉 Kỷ lục mới' : 'Điểm cao nhất') + '</span></div>' : '');
    $('t-sheet').innerHTML = '<h3>Bài làm</h3><div class="sheet-grid">' + S.qs.map((q, i) =>
      '<span class="sh ' + (S.res[i] ? 'o' : 'x') + '" title="' + esc(q.word + ' (' + q.read + ')') + '"><i>' + (i + 1) + '</i>' + q.c +
      '<em>' + (S.res[i] ? '○' : '×') + '</em></span>').join('') + '</div>';
    const wrong = S.qs.filter((q, i) => !S.res[i]);
    $('end-list').innerHTML = wrong.length
      ? '<h3>Chữ cần xem lại (' + wrong.length + ')</h3><div class="chips">' + wrong.map((q) => {
        const lv = gradeLevelOf(q.c) || levelId;
        return '<a class="chip-k bad" href="level.html?id=' + lv + '&k=' + encodeURIComponent(q.c) + '">' + q.c + ' <small>' + esc(q.word) + ' · ' + esc(q.read) + '</small></a>';
      }).join('') + '</div>'
      : '';
    const acts = [];
    if (wrong.length) acts.push('<button class="act-btn primary" id="retry-wrong">↺ Làm lại ' + wrong.length + ' câu sai</button>');
    acts.push('<button class="act-btn' + (wrong.length ? '' : ' primary') + '" id="again">📝 Làm bài mới</button>');
    if (nParam === 'stage' && P && P.stageInfo(levelId)[stageNo - 1].status === 'done') acts.push('<a class="act-btn primary" href="story.html?level=' + levelId + '&stage=' + stageNo + '">📖 Truyện ghi nhớ</a>');
    acts.push('<a class="act-btn' + (pathMsg && pathMsg.ok && nParam !== 'stage' ? ' primary' : '') + '" href="level.html?id=' + levelId + '">🗺 Về lộ trình ' + esc(levelName) + '</a>');
    if (pathMsg) $('end-list').innerHTML = '<div class="path-msg ' + (pathMsg.ok ? 'ok' : '') + '">' + pathMsg.html + '</div>' + $('end-list').innerHTML;
    $('end-actions').innerHTML = acts.join('');
    if ($('retry-wrong')) $('retry-wrong').onclick = () => startNew(wrong.map((q) => q.c), true);
    $('again').onclick = () => startNew(poolChars());
    if (pathMsg && pathMsg.celebrate) setTimeout(() => (pathMsg.celebrate.evolve ? sumiEvolve(pathMsg.celebrate.evolve[0], pathMsg.celebrate.evolve[1], pathMsg.celebrate) : sumiCelebrate(pathMsg.celebrate)), 400);
    else if (!S.retry && score >= PASS && (isBest || score === 100)) {
      setTimeout(() => sumiCelebrate({
        title: score === 100 ? '💮 はなまる！100点' : '◎ ごうかく！' + score + '点',
        sub: KIND_NAME[nParam] + ' · ' + esc(levelName) + '<br>' + (rec.n > 1 ? 'Kỷ lục mới của bạn!' : 'Lần đầu đã đạt, giỏi lắm!'),
        mascot: 'grad'
      }), 400);
    }
  }

  // ---------- Lộ trình: qua màn / qua cấp / vượt cấp ----------
  function pathResult(score) {
    const lvUrl = 'level.html?id=' + levelId;
    const formBefore = P.rank().form;
    const evo = () => { const f = P.rank().form; return f > formBefore ? [formBefore, f] : null; };
    if (nParam === 'stage') {
      const si = stageInfo();
      if (score < PASS) return { html: '⚔️ Chưa qua màn ' + stageNo + ': cần đúng từ ' + PASS + '%. Ôn lại các chữ sai rồi thử lại nhé!' };
      P.passStage(si.chars);
      const storyUrl = 'story.html?level=' + levelId + '&stage=' + stageNo;
      const info = P.stageInfo(levelId);
      const nx = info[stageNo];
      if (nx && nx.needMid) {
        return {
          ok: true,
          html: '📝 Đã qua màn ' + stageNo + ' – bạn đã học xong <b>nửa đầu</b> của cấp! Làm <b>Kiểm tra giữa cấp</b> (' + MID_SIZE + ' câu) để mở nửa sau.',
          celebrate: {
            title: '📝 Xong nửa chặng đường!', mascot: 'cheer',
            sub: 'Bạn đã qua màn ' + stageNo + ' của ' + esc(levelName) + '.<br>Làm <b>Kiểm tra giữa cấp</b>: ' + MID_SIZE + ' câu về các chữ đã học, đạt từ ' + PASS + ' điểm để mở màn ' + nx.no + '.<br>Trước đó, ghi nhớ các chữ vừa học qua một <b>câu chuyện ngắn</b> nhé!',
            button: '📖 Chơi Truyện ghi nhớ',
            onClose: () => { location.href = storyUrl; }
          }
        };
      }
      return {
        ok: true,
        html: nx ? '🔓 Đã qua màn ' + stageNo + '! <b>Màn ' + nx.no + '</b> đã mở khóa.' : '🏯 Đã qua màn cuối! Giờ hãy làm <b>Thi tổng hợp</b> để mở cấp tiếp theo.',
        celebrate: {
          title: nx ? '🔓 Mở khóa màn ' + nx.no + '!' : '🏯 Qua hết các màn!', mascot: 'cheer',
          sub: (nx ? 'Bạn đã qua màn ' + stageNo + ' của ' + esc(levelName) + '.' : 'Trận cuối: <b>Thi tổng hợp</b> toàn bộ ' + chars.length + ' chữ của ' + esc(levelName) + ', đạt từ ' + PASS + ' điểm để lên cấp.') + '<br>Giờ hãy ghi nhớ lần cuối các chữ này qua một <b>câu chuyện ngắn</b>!',
          button: '📖 Chơi Truyện ghi nhớ',
          onClose: () => { location.href = storyUrl; }
        }
      };
    }
    if (nParam === 'mid') {
      if (P.midState(levelId) === 'done') return null;
      if (score < PASS) return { html: '📝 Chưa qua kiểm tra giữa cấp: cần từ <b>' + PASS + ' điểm</b>. Xem lại các chữ sai rồi thử lại nhé!' };
      P.passMid(levelId);
      const nx = P.stageInfo(levelId).find((x) => x.status !== 'done');
      return {
        ok: true, html: '🔓 Đã qua kiểm tra giữa cấp! <b>Nửa sau</b> của ' + esc(levelName) + ' đã mở khóa.',
        celebrate: {
          title: '🔓 Mở khóa nửa sau!', mascot: 'cheer',
          sub: 'Kiểm tra giữa cấp ' + esc(levelName) + ': <b>' + score + ' điểm</b>.' + (nx ? '<br>Tiếp tục với màn ' + nx.no + '.' : ''),
          button: nx ? 'Học màn ' + nx.no : 'Về lộ trình',
          onClose: () => { location.href = lvUrl; }
        }
      };
    }
    if (!isGate || prefs.pool !== 'all' || P.cleared(levelId)) return null;
    const nx = P.nextOf(levelId);
    const nxName = nx ? P.short(nx) : 'cấp tiếp theo';
    if (score >= PASS && P.allStagesDone(levelId)) {
      P.passGate(levelId);
      return {
        ok: true, html: '🏆 Đã qua cấp ' + esc(levelName) + '! <b>' + esc(nxName) + '</b> đã mở khóa.',
        celebrate: { evolve: evo(), title: '🏆 Hoàn thành ' + esc(levelName) + '!', sub: 'Bạn đã qua thi tổng hợp với ' + score + ' điểm.<br>🔓 Mở khóa <b>' + esc(nxName) + '</b> · Lv ' + P.rank().label, mascot: 'grad', button: nx ? 'Sang ' + esc(nxName) : 'Tuyệt vời!', onClose: () => { if (nx) location.href = 'level.html?id=' + nx; } }
      };
    }
    if (score >= P.SKIP) {
      if (confirm('Bạn đạt ' + score + ' điểm – đủ để VƯỢT CẤP ' + levelName + '!\n\nCác chữ chưa học của cấp này sẽ được tính là đã học và đưa vào Ôn tập.\nVượt cấp ngay?')) {
        const n = P.skipLevel(levelId);
        return {
          ok: true, html: '🚀 Đã vượt cấp ' + esc(levelName) + ' (' + n + ' chữ được đưa vào ôn tập). <b>' + esc(nxName) + '</b> đã mở khóa.',
          celebrate: { evolve: evo(), title: '🚀 Vượt cấp thành công!', sub: esc(levelName) + ' · ' + score + ' điểm<br>🔓 Mở khóa <b>' + esc(nxName) + '</b> · Lv ' + P.rank().label, mascot: 'grad', button: nx ? 'Sang ' + esc(nxName) : 'OK', onClose: () => { if (nx) location.href = 'level.html?id=' + nx; } }
        };
      }
      return { html: 'Bạn đủ điểm vượt cấp nhưng đã chọn ở lại. Có thể làm lại bài thi bất cứ lúc nào.' };
    }
    if (score >= PASS) return { html: '◎ Đạt ' + score + ' điểm, nhưng cần <b>qua hết các màn</b> của cấp trước – hoặc đạt từ <b>' + P.SKIP + ' điểm</b> để vượt cấp.' };
    return { html: 'Thi tổng hợp cần từ <b>' + PASS + ' điểm</b> để lên cấp (hoặc ' + P.SKIP + ' điểm để vượt cấp). Ôn thêm rồi thử lại nhé!' };
  }

  // ---------- Màn hình bắt đầu ----------
  function poolChars() {
    if (nParam === 'stage') { const si = stageInfo(); return si ? si.chars.slice() : []; }
    if (nParam === 'mid') return P.midChars(levelId);
    return chars.slice();
  }

  function setSeg(id, val) {
    document.querySelectorAll('#' + id + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === val));
  }

  function renderStart() {
    show('screen-start');
    setSeg('opt-write', prefs.write);
    const size = nParam === 'mid' ? MID_SIZE : poolChars().length;
    $('start-mascot').innerHTML = mascotSvg(nParam === 'all' ? 'grad' : nParam === 'mid' ? 'glasses' : 'pencil', 'big-mascot');
    $('start-title').textContent = ICON[nParam] + KIND_NAME[nParam] + ' – ' + levelName;
    document.querySelector('#opt-pool').closest('.t-opt-group').hidden = true;
    let sub = '<b>' + size + ' câu</b>';
    const lockScreen = (msg) => {
      $('start-sub').innerHTML = msg;
      $('start-rules').innerHTML = '';
      $('resume').hidden = true;
      $('start-actions').innerHTML = '<a class="act-btn primary" href="level.html?id=' + levelId + '">🗺 Về lộ trình</a>';
    };
    if (nParam === 'stage') {
      const si = stageInfo();
      if (!si || si.status === 'locked' || si.status === 'open') return lockScreen('🔒 Hãy học hết ' + (si ? si.total : '') + ' chữ của màn ' + stageNo + ' trước khi làm kiểm tra màn.');
      sub += ' – tất cả chữ của màn ' + stageNo + ': ' + si.chars.join(' ') + '. Đúng từ <b>' + Math.ceil(si.total * PASS / 100) + '/' + si.total + '</b> câu để mở màn tiếp theo.';
    } else if (nParam === 'mid') {
      const ms = P.midState(levelId);
      if (ms === 'none') return lockScreen('Cấp này nhỏ nên không có kiểm tra giữa cấp.');
      if (ms === 'locked') return lockScreen('🔒 Hãy qua hết <b>' + P.half(levelId) + ' màn đầu</b> của cấp trước khi làm kiểm tra giữa cấp.');
      sub += ' về ' + poolChars().length + ' chữ của nửa đầu cấp (màn 1–' + P.half(levelId) + '). Đạt từ <b>' + PASS + ' điểm</b> để mở nửa sau.' +
        (ms === 'done' ? ' <i>(Bạn đã qua bài này – làm lại để ôn.)</i>' : '');
    } else {
      sub += ' – toàn bộ chữ của ' + esc(levelName) + '. ' + (P.cleared(levelId) ? '<i>(Bạn đã qua cấp này – làm lại để ôn.)</i>'
        : P.allStagesDone(levelId) ? 'Đạt từ <b>' + PASS + ' điểm</b> để lên cấp.' : 'Bạn chưa qua hết các màn: chỉ đạt từ <b>' + P.SKIP + ' điểm</b> mới được vượt cấp.');
    }
    $('start-sub').innerHTML = sub;
    const rec = Sumi.testResult(testKey);
    $('start-rules').innerHTML = '<ul>' +
      '<li><b>読み (đọc):</b> chọn cách đọc đúng của từ gạch chân trong câu. Coi chừng trường âm, っ và dấu ゛.</li>' +
      '<li><b>書き (viết):</b> nhìn chữ hiragana in đậm, viết chữ Hán vào ô rồi tự chấm, hoặc chọn cách viết đúng.</li>' +
      '<li>Mỗi câu đúng <b>+1⭐</b>. Từ <b>' + PASS + ' điểm</b> là đạt, 100 điểm được 💮 はなまる.</li>' +
      (nParam !== 'stage' ? '<li>Bài được <b>lưu tự động</b>: bấm ⏸ để dừng, lần sau làm tiếp.</li>' : '') +
      (isGate && P && !P.cleared(levelId) ? '<li class="gate">🏯 <b>Thi tổng hợp</b>: qua hết các màn rồi đạt từ <b>' + PASS + ' điểm</b> để lên cấp và Hiyo tiến hóa · đạt từ <b>' + P.SKIP + ' điểm</b> là <b>vượt cấp</b> ngay.</li>' : '') +
      (rec ? '<li class="small">Điểm cao nhất: <b>' + rec.best + '</b> · lần trước: ' + rec.last + ' (' + rec.n + ' lần làm)</li>' : '') +
      '</ul>';

    const sess = store.get(SESSION_KEY, null);
    const canResume = sess && sess.key === testKey && sess.i < sess.qs.length && sess.qs.every((q) => data[q.c]);
    $('resume').hidden = !canResume;
    if (canResume) {
      const okN = sess.res.filter(Boolean).length;
      $('resume').innerHTML = '⏸ Bạn đang làm dở: <b>câu ' + (sess.i + 1) + ' / ' + sess.qs.length + '</b> (○ ' + okN + ' · × ' + (sess.res.length - okN) + ')';
    }
    $('start-actions').innerHTML = (canResume ? '<button class="act-btn primary" id="resume-btn">▶ Làm tiếp</button><button class="act-btn" id="go">↺ Làm bài mới</button>'
      : '<button class="act-btn primary" id="go">▶ Bắt đầu làm bài</button>');
    $('go').onclick = () => startNew(poolChars());
    if (canResume) $('resume-btn').onclick = () => { S = sess; S.write = prefs.write; beginQuiz(); };
  }

  ['opt-pool', 'opt-write'].forEach((id) => {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      prefs[id === 'opt-pool' ? 'pool' : 'write'] = b.dataset.v;
      store.set(PREF_KEY, prefs);
      renderStart();
    });
  });

  // ---------- Khởi động ----------
  document.title = KIND_NAME[nParam] + ' – ' + levelName + ' – Sumi Kanji';
  $('top-title').textContent = ICON[nParam] + KIND_NAME[nParam];
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  updateXP();
  chars = levelChars(levelId);
  Promise.all(level.src.map((k) => loadScript('data/kanji-' + k + '.js').then(() => Object.assign(data, window.SUMI_DATA[k]))))
    .then(renderStart)
    .catch((err) => {
      show('screen-start');
      $('start-title').textContent = 'Không tải được dữ liệu';
      $('start-sub').textContent = err.message;
    });
})();
