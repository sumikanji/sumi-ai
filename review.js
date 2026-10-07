// ===== Trang ôn tập: Ôn tập (SRS) · Thử thách 60 giây · Kiểm tra theo cấp =====
(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const MODES = ['review', 'blitz', 'practice'];
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'review';
  const levelId = LEVELS[params.get('level')] ? params.get('level') : null;
  if (levelId && window.SumiPath && !SumiPath.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }

  const IDX = window.SUMI_INDEX || {};
  const KANKEN = window.SUMI_KANKEN || {};
  const kankenOf = {};
  for (const k of Object.keys(KANKEN)) for (const ch of Array.from(KANKEN[k])) kankenOf[ch] = k;

  const data = {};          // dữ liệu chi tiết đã nạp
  const loaded = new Set();
  const REVIEW_BATCH = 20;
  const PRACTICE_COUNT = 10;
  const BLITZ_SECONDS = 60;

  // ---------- Tiện ích ----------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const enShort = (s) => (s || '').split(', ').slice(0, 2).join(', ');
  const hvOf = (c) => (IDX[c] ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1] : '');
  const enOf = (c) => (IDX[c] ? IDX[c][2] : '');

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

  function loadLevelsFor(chars) {
    const need = Array.from(new Set(chars.map((c) => kankenOf[c]).filter((k) => k && !loaded.has(k))));
    return Promise.all(need.map((k) => loadScript('data/kanji-' + k + '.js').then(() => {
      loaded.add(k);
      Object.assign(data, window.SUMI_DATA[k]);
    })));
  }

  // Chữ gây nhiễu cùng cấp
  function distractorChars(c, n, avoid) {
    const pool = Array.from(KANKEN[kankenOf[c]] || '');
    const out = [];
    const seenHv = new Set([hvOf(c)]);
    const seenVi = new Set([viOf(c)]);
    for (const x of shuffle(pool)) {
      if (x === c || (avoid && avoid.has(x))) continue;
      if (seenHv.has(hvOf(x)) || seenVi.has(viOf(x))) continue;
      out.push(x); seenHv.add(hvOf(x)); seenVi.add(viOf(x));
      if (out.length >= n) break;
    }
    return out;
  }

  const markIn = (w, c) => Array.from(w).map((ch) => ch === c ? '<mark>' + ch + '</mark>' : esc(ch)).join('');

  function sentenceHtml(segs, c, blank) {
    return segs.map((sg) => {
      if (typeof sg === 'string') return esc(sg);
      if (sg[0].includes(c)) {
        if (blank) return '<ruby>' + Array.from(sg[0]).map((ch) => ch === c ? '<span class="blank">？</span>' : esc(ch)).join('') + '<rt>&nbsp;</rt></ruby>';
        return '<ruby>' + markIn(sg[0], c) + '<rt>' + esc(sg[1]) + '</rt></ruby>';
      }
      return '<ruby>' + esc(sg[0]) + '<rt>' + esc(sg[1]) + '</rt></ruby>';
    }).join('');
  }

  // ---------- Tạo câu hỏi ----------
  // A: chữ → nghĩa · B: nghĩa → chữ · C: từ → cách đọc · D: điền chữ vào câu
  function canDo(type, c) {
    const d = data[c];
    if (type === 'A' || type === 'B') return !!IDX[c];
    if (type === 'C') return !!(d && d.w && d.w.length);
    if (type === 'D') return !!(d && d.sn && d.sn.some((s) => s[0].some((sg) => typeof sg !== 'string' && sg[0].includes(c))));
    return false;
  }

  function makeQuestion(c, types) {
    const ok = types.filter((t) => canDo(t, c));
    const type = pick(ok.length ? ok : ['A']);
    const q = { c, type };
    const d = data[c];

    if (type === 'A') {
      const opts = shuffle([c].concat(distractorChars(c, 3)));
      q.label = 'Chữ này có nghĩa là gì?';
      q.prompt = '<div class="q-kanji">' + c + '</div>';
      q.options = opts.map((x) => ({ key: x, html: '<b>' + esc(viOf(x)) + '</b><small>' + esc(enShort(enOf(x))) + '</small>' }));
      q.answer = c;
    } else if (type === 'B') {
      const opts = shuffle([c].concat(distractorChars(c, 3)));
      q.label = 'Chữ Hán nào mang nghĩa này?';
      q.prompt = '<div class="q-hv">' + esc(hvOf(c).startsWith('(') ? '' : hvOf(c)) + '</div><div class="q-mean">' + esc(viOf(c)) +
        '</div><div class="q-en">' + esc(enShort(enOf(c))) + '</div>';
      q.options = opts.map((x) => ({ key: x, html: '<span class="opt-kanji">' + x + '</span>' }));
      q.answer = c;
    } else if (type === 'C') {
      const w = pick(d.w);
      q.word = w;
      const others = [];
      for (const x of shuffle(Object.keys(data))) {
        if (x === c) continue;
        for (const ow of data[x].w || []) {
          if (ow[1] !== w[1] && Math.abs(ow[1].length - w[1].length) <= 1 && !others.includes(ow[1])) { others.push(ow[1]); break; }
        }
        if (others.length >= 3) break;
      }
      const opts = shuffle([w[1]].concat(others.slice(0, 3)));
      q.label = 'Từ này đọc là gì?';
      q.prompt = '<div class="q-word">' + markIn(w[0], c) + '</div>';
      q.options = opts.map((r) => ({ key: r, html: '<span class="opt-read">' + esc(r) + '</span>' }));
      q.answer = w[1];
    } else {
      const cands = d.sn.filter((s) => s[0].some((sg) => typeof sg !== 'string' && sg[0].includes(c)));
      const s = pick(cands);
      q.sent = s;
      const opts = shuffle([c].concat(distractorChars(c, 3)));
      q.label = 'Điền chữ còn thiếu vào chỗ trống';
      q.prompt = '<p class="q-sent">' + sentenceHtml(s[0], c, true) + '</p><p class="q-sent-vi">' + esc(s[1]) + '</p>';
      q.options = opts.map((x) => ({ key: x, html: '<span class="opt-kanji">' + x + '</span>' }));
      q.answer = c;
    }
    return q;
  }

  // Thông tin hiện sau khi trả lời
  function answerInfo(q) {
    const c = q.c;
    const d = data[c];
    let h = '<div class="fb-main"><span class="fb-kanji">' + c + '</span><div><div class="fb-hv">' +
      esc(hvOf(c).startsWith('(') ? '' : hvOf(c)) + '</div><div class="fb-vi">' + esc(viOf(c)) +
      '</div><div class="fb-en">' + esc(enShort(enOf(c))) + '</div></div></div>';
    if (q.word) {
      const w = q.word;
      h += '<div class="fb-row"><b class="jp">' + markIn(w[0], c) + '</b> <span class="jp">' + esc(w[1]) + '</span> — ' + esc(w[3]) +
        (w[4] ? ' <span class="en">· ' + esc(w[4]) + '</span>' : '') + '</div>';
    } else if (d && d.w && d.w.length) {
      const w = d.w[0];
      h += '<div class="fb-row"><b class="jp">' + markIn(w[0], c) + '</b> <span class="jp">' + esc(w[1]) + '</span> — ' + esc(w[3]) +
        (w[4] ? ' <span class="en">· ' + esc(w[4]) + '</span>' : '') + '</div>';
    }
    if (q.sent) {
      h += '<div class="fb-row"><p class="fb-sent">' + sentenceHtml(q.sent[0], c, false) + '</p><p class="fb-tr">' + esc(q.sent[1]) +
        (q.sent[2] ? '<br><span class="en">' + esc(q.sent[2]) + '</span>' : '') + '</p></div>';
    }
    const lv = gradeLevelOf(c);
    if (lv) h += '<a class="fb-link" href="level.html?id=' + lv + '&k=' + encodeURIComponent(c) + '">📖 Xem lại cách học chữ này</a>';
    return h;
  }

  // ---------- Hiển thị câu hỏi ----------
  let current = null;
  let answered = false;
  let onAnswer = null;

  function renderQuestion(q) {
    current = q;
    answered = false;
    $('q-label').textContent = q.label;
    $('q-prompt').innerHTML = q.prompt;
    $('q-card').className = 'q-card type-' + q.type;
    $('options').className = 'options' + (q.options[0].html.includes('opt-kanji') ? ' kanji-opts' : '');
    $('options').innerHTML = q.options.map((o, i) =>
      '<button class="opt" data-key="' + esc(o.key) + '"><span class="opt-num">' + (i + 1) + '</span>' + o.html + '</button>').join('');
    $('feedback').hidden = true;
  }

  $('options').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (b) choose(b.dataset.key);
  });

  function choose(key) {
    if (answered || !current) return;
    answered = true;
    const ok = key === current.answer;
    document.querySelectorAll('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === current.answer) b.classList.add('right');
      else if (b.dataset.key === key) b.classList.add('wrong');
    });
    if (!ok) $('q-card').classList.add('shake');
    onAnswer(ok, key);
  }

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.fx-overlay')) return;
    if (!$('screen-quiz').hidden && !answered && /^[1-4]$/.test(e.key)) {
      const b = document.querySelectorAll('.opt')[Number(e.key) - 1];
      if (b) choose(b.dataset.key);
    } else if ((e.key === 'Enter' || e.key === ' ') && !$('feedback').hidden) {
      e.preventDefault();
      $('next-btn').click();
    } else if (e.key === 'Enter' && !$('screen-start').hidden) {
      const b = document.querySelector('#start-actions .primary');
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  const PRAISE = ['Giỏi quá!', 'Chính xác!', 'すごい!', 'Tuyệt vời!', 'Đúng rồi!', 'Xuất sắc!', 'よくできました!'];
  const COMFORT = ['Không sao, ôn lại nhé!', 'Suýt đúng rồi!', 'Lần sau sẽ nhớ!', 'Sai mới nhớ lâu!'];

  function showFeedback(ok, extraStage) {
    $('fb-mascot').innerHTML = mascotSvg(ok ? 'cheer' : 'oops', 'fb-svg');
    $('fb-verdict').textContent = ok ? pick(PRAISE) : pick(COMFORT);
    $('fb-verdict').className = 'fb-verdict ' + (ok ? 'ok' : 'bad');
    $('fb-stage').innerHTML = extraStage || '';
    $('fb-info').innerHTML = answerInfo(current);
    $('feedback').hidden = false;
    $('feedback').className = 'feedback ' + (ok ? 'ok' : 'bad');
    setTimeout(() => $('next-btn').focus(), 30);
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function linkBtn(href, text, primary) {
    return '<a class="act-btn' + (primary ? ' primary' : '') + '" href="' + href + '">' + text + '</a>';
  }

  function goalBox() {
    const st = Sumi.load();
    const xp = Sumi.todayXP();
    const pct = Math.min(100, Math.round((xp / st.goal) * 100));
    const s = Sumi.streakInfo();
    return '<div class="goal-line"><span>🎯 Mục tiêu hôm nay</span><b>' + xp + ' / ' + st.goal + ' điểm</b></div>' +
      '<div class="bar big"><span style="width:' + pct + '%"></span></div>' +
      '<div class="goal-note">🔥 Chuỗi ' + s.count + ' ngày' + (s.todayDone ? ' · đã hoàn thành hôm nay ✓' : ' · còn ' + Math.max(0, st.goal - xp) + ' điểm để giữ chuỗi') + '</div>';
  }

  // =====================================================================
  // CHẾ ĐỘ 1: ÔN TẬP (SRS)
  // =====================================================================
  function startReview() {
    $('top-title').textContent = '📚 Ôn tập hôm nay';
    const due = Sumi.dueList();
    if (!due.length) {
      const nd = Sumi.nextDue();
      const total = Object.keys(Sumi.load().cards).length;
      $('start-mascot').innerHTML = mascotSvg(total ? 'grad' : 'think', 'big-mascot');
      $('start-title').textContent = total ? 'Hôm nay không có chữ nào cần ôn 🎉' : 'Bạn chưa học chữ nào';
      $('start-sub').innerHTML = total
        ? (nd ? 'Lượt ôn tiếp theo: <b>' + (nd.inDays === 1 ? 'ngày mai' : nd.inDays + ' ngày nữa') + '</b> (' + nd.count + ' chữ).' : '') +
          '<br>Học thêm chữ mới để giữ chuỗi ngày nhé!'
        : 'Hãy học vài chữ đầu tiên. Ngày mai chúng sẽ xuất hiện ở đây để ôn lại.';
      $('start-rules').innerHTML = goalBox();
      $('start-actions').innerHTML = linkBtn('index.html', '📖 Học chữ mới', true) + linkBtn('route.html#on-tap', '❓ Ôn tập ngắt quãng là gì?');
      show('screen-start');
      return;
    }
    const batch = due.slice(0, REVIEW_BATCH);
    loadLevelsFor(batch).then(() => runReview(batch, due.length));
  }

  function runReview(batch, totalDue) {
    let queue = shuffle(batch);
    const firstResult = {};   // c -> kết quả lần đầu
    const stageMoves = [];
    let xpGained = 0;
    let doneCount = 0;
    let pendingCelebrate = null;

    function meta() {
      $('meta-left').textContent = 'Đã ôn ' + doneCount + ' / ' + batch.length;
      const okN = Object.values(firstResult).filter(Boolean).length;
      $('meta-right').textContent = '✅ ' + okN + '  ❌ ' + (Object.keys(firstResult).length - okN);
      $('bar-fill').style.width = (doneCount / batch.length * 100) + '%';
    }

    function next() {
      if (!queue.length) return finish();
      const c = queue.shift();
      renderQuestion(makeQuestion(c, ['A', 'B', 'C', 'D', 'D']));
      meta();
    }

    onAnswer = (ok) => {
      const c = current.c;
      let stageHtml = '';
      if (!(c in firstResult)) {
        firstResult[c] = ok;
        const res = Sumi.review(c, ok);
        if (res) {
          xpGained += res.xp;
          const a = Sumi.STAGES[res.after], b = Sumi.STAGES[res.before];
          stageMoves.push({ c, before: res.before, after: res.after });
          stageHtml = (res.after > res.before
            ? b.icon + ' → ' + a.icon + ' <b>' + a.name + '</b> · ôn lại sau ' + res.nextIn + ' ngày'
            : res.after < res.before ? b.icon + ' → ' + a.icon + ' Lùi về <b>' + a.name + '</b> · ôn lại ngày mai'
              : a.icon + ' ' + a.name + ' · ôn lại ' + (res.nextIn === 1 ? 'ngày mai' : 'sau ' + res.nextIn + ' ngày')) +
            ' <span class="xp-pop">+' + res.xp + '⭐</span>';
          if (res.goalJustMet) pendingCelebrate = res;
        }
      }
      if (ok) doneCount++;
      else queue.push(c); // hỏi lại cuối lượt
      updateXP();
      showFeedback(ok, stageHtml);
    };

    $('next-btn').onclick = () => {
      if (pendingCelebrate) { const r = pendingCelebrate; pendingCelebrate = null; sumiGoalCelebrate(r, next); return; }
      next();
    };

    function finish() {
      const okList = Object.keys(firstResult).filter((c) => firstResult[c]);
      const badList = Object.keys(firstResult).filter((c) => !firstResult[c]);
      const ups = stageMoves.filter((m) => m.after > m.before);
      const remaining = Sumi.dueList().length;
      $('end-mascot').innerHTML = mascotSvg(badList.length <= batch.length / 4 ? 'cheer' : 'book', 'big-mascot');
      $('end-title').textContent = badList.length === 0 ? 'Hoàn hảo! Nhớ hết rồi 🎉' : 'Hoàn thành lượt ôn!';
      $('end-stats').innerHTML =
        stat(okList.length + '/' + batch.length, 'Nhớ ngay lần đầu') +
        stat('+' + xpGained, 'Điểm nhận được') +
        stat(ups.length, 'Chữ lên cấp nhớ');
      $('end-goal').innerHTML = goalBox();
      let list = '';
      if (ups.length) list += '<h3>Lên cấp nhớ</h3><div class="chips">' + ups.map((m) => '<span class="chip-k">' + m.c + ' ' + Sumi.STAGES[m.after].icon + '</span>').join('') + '</div>';
      if (badList.length) list += '<h3>Cần chú ý thêm</h3><div class="chips">' + badList.map((c) => '<a class="chip-k bad" href="level.html?id=' + gradeLevelOf(c) + '&k=' + encodeURIComponent(c) + '">' + c + ' <small>' + esc(viOf(c)) + '</small></a>').join('') + '</div>';
      $('end-list').innerHTML = list;
      $('end-actions').innerHTML =
        (remaining ? '<button class="act-btn primary" id="again">📚 Ôn tiếp (' + remaining + ' chữ)</button>' : linkBtn('index.html', '📖 Học chữ mới', true)) +
        linkBtn('index.html', '🏠 Trang chủ');
      const again = $('again');
      if (again) again.onclick = () => startReview();
      show('screen-end');
    }

    show('screen-quiz');
    next();
  }

  function stat(v, l) { return '<div class="stat"><b>' + v + '</b><span>' + l + '</span></div>'; }

  // =====================================================================
  // CHẾ ĐỘ 2: THỬ THÁCH 60 GIÂY
  // =====================================================================
  function blitzPool() {
    const learned = Object.keys(Sumi.load().cards).filter((c) => IDX[c]);
    if (learned.length >= 12) return { pool: learned, note: 'Dùng ' + learned.length + ' chữ bạn đã học.' };
    const base = Array.from(KANKEN.k10 || '');
    const pool = Array.from(new Set(learned.concat(base)));
    return { pool, note: 'Bạn chưa học đủ 12 chữ, nên thử thách dùng thêm chữ Lớp 1.' };
  }

  function startBlitz() {
    $('top-title').textContent = '⚡ Thử thách 60 giây';
    const best = Sumi.load().best.blitz || 0;
    const { note } = blitzPool();
    $('start-mascot').innerHTML = mascotSvg('pencil', 'big-mascot');
    $('start-title').textContent = 'Trả lời càng nhanh càng tốt!';
    $('start-sub').innerHTML = '🏆 Kỷ lục của bạn: <b>' + best + ' điểm</b>';
    $('start-rules').innerHTML = '<ul>' +
      '<li>⏱ Có <b>60 giây</b>. Mỗi câu đúng được điểm, đúng liên tiếp sẽ <b>nhân điểm</b> (x2 từ 5 câu, x3 từ 10 câu).</li>' +
      '<li>❌ Sai thì mất chuỗi nhân điểm và bị trừ 3 giây.</li>' +
      '<li>⌨️ Dùng phím <b>1–4</b> để trả lời nhanh hơn.</li>' +
      '<li>⭐ Mỗi câu đúng được cộng 1 điểm vào mục tiêu ngày.</li></ul><p class="small">' + note + '</p>';
    $('start-actions').innerHTML = '<button class="act-btn primary" id="go">▶ Bắt đầu</button>';
    $('go').onclick = runBlitz;
    show('screen-start');
  }

  function runBlitz() {
    const { pool } = blitzPool();
    let timeLeft = BLITZ_SECONDS * 1000;
    let score = 0, correct = 0, wrong = 0, combo = 0, maxCombo = 0;
    const recent = [];
    const missed = [];
    let timer = null;
    let lastTick = performance.now();
    let running = true;

    function mult() { return combo >= 10 ? 3 : combo >= 5 ? 2 : 1; }

    function meta() {
      $('meta-left').innerHTML = '⏱ <b>' + Math.ceil(timeLeft / 1000) + 's</b>';
      $('meta-right').innerHTML = (combo >= 2 ? '<span class="combo">🔥 ' + combo + ' liên tiếp · x' + mult() + '</span> ' : '') + '<b>' + score + '</b> điểm';
      $('bar-fill').style.width = Math.max(0, timeLeft / (BLITZ_SECONDS * 1000) * 100) + '%';
      $('bar-fill').parentElement.classList.toggle('danger', timeLeft < 10000);
    }

    function next() {
      if (!running) return;
      let c;
      let guard = 0;
      do { c = pick(pool); guard++; } while (recent.includes(c) && guard < 20);
      recent.push(c); if (recent.length > 6) recent.shift();
      renderQuestion(makeQuestion(c, ['A', 'B']));
      meta();
    }

    onAnswer = (ok) => {
      if (ok) {
        combo++; maxCombo = Math.max(maxCombo, combo);
        score += mult(); correct++;
        $('q-card').classList.add('flash-ok');
      } else {
        combo = 0; wrong++;
        timeLeft -= 3000;
        if (!missed.includes(current.c)) missed.push(current.c);
      }
      meta();
      setTimeout(() => { $('q-card').classList.remove('flash-ok', 'shake'); next(); }, ok ? 260 : 900);
    };

    function tick() {
      const now = performance.now();
      timeLeft -= now - lastTick;
      lastTick = now;
      if (timeLeft <= 0) { timeLeft = 0; meta(); return end(); }
      meta();
      timer = requestAnimationFrame(tick);
    }

    function end() {
      running = false;
      cancelAnimationFrame(timer);
      const isRecord = Sumi.setBest('blitz', score);
      const res = correct ? Sumi.addXP(correct * Sumi.XP.quiz) : null;
      updateXP();
      $('end-mascot').innerHTML = mascotSvg(isRecord ? 'grad' : 'cheer', 'big-mascot');
      $('end-title').textContent = isRecord && score > 0 ? '🏆 Kỷ lục mới!' : 'Hết giờ!';
      const acc = correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0;
      $('end-stats').innerHTML = stat(score, 'Điểm') + stat(correct + '/' + (correct + wrong), 'Câu đúng (' + acc + '%)') + stat(maxCombo, 'Chuỗi đúng dài nhất');
      $('end-goal').innerHTML = goalBox();
      $('end-list').innerHTML = missed.length
        ? '<h3>Chữ trả lời sai</h3><div class="chips">' + missed.map((c) => '<a class="chip-k bad" href="level.html?id=' + gradeLevelOf(c) + '&k=' + encodeURIComponent(c) + '">' + c + ' <small>' + esc(viOf(c)) + '</small></a>').join('') + '</div>'
        : '';
      $('end-actions').innerHTML = '<button class="act-btn primary" id="again">↺ Chơi lại</button>' +
        linkBtn('review.html', '📚 Ôn tập') + linkBtn('index.html', '🏠 Trang chủ');
      $('again').onclick = runBlitz;
      show('screen-end');
      const after = () => { if (res) sumiGoalCelebrate(res); };
      if (isRecord && score > 0) {
        sumiCelebrate({ title: '🏆 Kỷ lục mới: ' + score + ' điểm!', sub: 'Chuỗi đúng dài nhất: ' + maxCombo + ' câu', mascot: 'grad', onClose: after });
      } else after();
    }

    show('screen-quiz');
    lastTick = performance.now();
    next();
    timer = requestAnimationFrame(tick);
  }

  // =====================================================================
  // CHẾ ĐỘ 3: KIỂM TRA THEO CẤP
  // =====================================================================
  function startPractice() {
    const lv = LEVELS[levelId || 'g1'];
    const id = levelId || 'g1';
    $('top-title').textContent = '📝 Kiểm tra: ' + lv.title.split(' (')[0];
    $('back-btn').href = 'level.html?id=' + id;
    $('back-btn').textContent = '← Quay lại cấp';
    const all = levelChars(id);
    const learnedMap = loadLearned();
    const learnedHere = all.filter((c) => learnedMap[c]);
    const useLearned = learnedHere.length >= 4;
    const pool = useLearned ? learnedHere : all;
    const qs = shuffle(pool).slice(0, Math.min(PRACTICE_COUNT, pool.length));
    loadLevelsFor(all.slice(0, 1).concat(qs)).then(() => {
      $('start-mascot').innerHTML = mascotSvg(lv.mascot, 'big-mascot');
      $('start-title').textContent = lv.title;
      $('start-sub').innerHTML = qs.length + ' câu hỏi · ' + (useLearned ? 'từ ' + learnedHere.length + ' chữ bạn đã học ở cấp này' : 'từ toàn bộ chữ của cấp (bạn chưa học đủ 4 chữ)');
      $('start-rules').innerHTML = '<ul><li>4 dạng câu: nghĩa của chữ, chọn chữ đúng, cách đọc từ, điền chữ vào câu.</li><li>Phần này để luyện tập nên không ảnh hưởng lịch ôn. Mỗi câu đúng được +1⭐.</li></ul>';
      $('start-actions').innerHTML = '<button class="act-btn primary" id="go">▶ Bắt đầu</button>';
      $('go').onclick = () => runPractice(qs, id);
      show('screen-start');
    });
  }

  function runPractice(qs, id) {
    let i = 0, okN = 0;
    const bad = [];
    let pendingCelebrate = null;
    function next() {
      if (i >= qs.length) return finish();
      renderQuestion(makeQuestion(qs[i], ['A', 'B', 'C', 'D']));
      $('meta-left').textContent = 'Câu ' + (i + 1) + ' / ' + qs.length;
      $('meta-right').textContent = '✅ ' + okN;
      $('bar-fill').style.width = (i / qs.length * 100) + '%';
    }
    onAnswer = (ok) => {
      let extra = '';
      if (ok) {
        okN++;
        const r = Sumi.addXP(Sumi.XP.quiz);
        if (r.goalJustMet) pendingCelebrate = r;
        extra = '<span class="xp-pop">+1⭐</span>';
      } else bad.push(current.c);
      $('meta-right').textContent = '✅ ' + okN;
      updateXP();
      showFeedback(ok, extra);
    };
    $('next-btn').onclick = () => {
      i++;
      if (pendingCelebrate) { const r = pendingCelebrate; pendingCelebrate = null; sumiGoalCelebrate(r, next); return; }
      next();
    };
    function finish() {
      const pct = Math.round(okN / qs.length * 100);
      $('end-mascot').innerHTML = mascotSvg(pct >= 80 ? 'grad' : pct >= 50 ? 'cheer' : 'book', 'big-mascot');
      $('end-title').textContent = pct === 100 ? 'Điểm tuyệt đối! 💯' : pct >= 80 ? 'Rất tốt!' : pct >= 50 ? 'Khá lắm, cố thêm chút nữa!' : 'Ôn lại thêm rồi thử lại nhé!';
      $('end-stats').innerHTML = stat(okN + '/' + qs.length, 'Câu đúng') + stat(pct + '%', 'Tỉ lệ đúng') + stat('+' + okN, 'Điểm nhận được');
      $('end-goal').innerHTML = goalBox();
      $('end-list').innerHTML = bad.length
        ? '<h3>Xem lại các chữ này</h3><div class="chips">' + bad.map((c) => '<a class="chip-k bad" href="level.html?id=' + id + '&k=' + encodeURIComponent(c) + '">' + c + ' <small>' + esc(viOf(c)) + '</small></a>').join('') + '</div>'
        : '';
      $('end-actions').innerHTML = '<a class="act-btn primary" href="review.html?mode=practice&level=' + id + '">↺ Làm bài mới</a>' +
        linkBtn('level.html?id=' + id, '📖 Quay lại cấp') + linkBtn('index.html', '🏠 Trang chủ');
      show('screen-end');
    }
    show('screen-quiz');
    next();
  }

  // ---------- Khởi động ----------
  updateXP();
  if (mode === 'blitz') startBlitz();
  else if (mode === 'practice') startPractice();
  else startReview();
})();
