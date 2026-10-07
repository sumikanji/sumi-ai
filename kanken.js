// ===== Thi thử Kanken (漢検 模擬試験): đúng cấu trúc đề chính thức, có tính giờ, chấm điểm, đáp án =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = sumiEsc;
  const K = SumiKana;
  const app = $('app');
  const params = new URLSearchParams(location.search);
  const LV = ['k10', 'k9', 'k8', 'k7', 'k6', 'k5', 'k4', 'k3', 'k2s', 'k2'];
  const INFO = {
    k10: { name: '10級', eq: 'Lớp 1 tiểu học', kanji: 80, full: 150, pass: 0.8, min: 40 },
    k9: { name: '9級', eq: 'Lớp 2 tiểu học', kanji: 240, full: 150, pass: 0.8, min: 40 },
    k8: { name: '8級', eq: 'Lớp 3 tiểu học', kanji: 440, full: 150, pass: 0.8, min: 40 },
    k7: { name: '7級', eq: 'Lớp 4 tiểu học', kanji: 642, full: 200, pass: 0.7, min: 60 },
    k6: { name: '6級', eq: 'Lớp 5 tiểu học', kanji: 835, full: 200, pass: 0.7, min: 60 },
    k5: { name: '5級', eq: 'Lớp 6 tiểu học', kanji: 1026, full: 200, pass: 0.7, min: 60 },
    k4: { name: '4級', eq: 'Giữa THCS', kanji: 1339, full: 200, pass: 0.7, min: 60 },
    k3: { name: '3級', eq: 'Tốt nghiệp THCS', kanji: 1623, full: 200, pass: 0.7, min: 60 },
    k2s: { name: '準2級', eq: 'Giữa THPT', kanji: 1951, full: 200, pass: 0.7, min: 60 },
    k2: { name: '2級', eq: 'Tốt nghiệp THPT – xã hội', kanji: 2136, full: 200, pass: 0.8, min: 60 }
  };
  const N_EXAMS = 5;
  const LABELS = 'アイウエオカキクケコ'.split('');
  const SESSION_KEY = 'sumiKanji.kanken.session';
  const PREF_KEY = 'sumiKanji.kanken.prefs';
  const KANKEN_OF = {};
  Object.keys(window.SUMI_KANKEN || {}).forEach((k) => Array.from(window.SUMI_KANKEN[k]).forEach((c) => { KANKEN_OF[c] = k; }));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* đầy bộ nhớ */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  const prefs = Object.assign({ write: 'hand', timer: true }, store.get(PREF_KEY, {}));
  const keyOf = (L, no) => 'kanken:' + L + ':' + no;

  // ---------- Nạp dữ liệu ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Không tải được ' + src));
      document.head.appendChild(s);
    });
  }
  function loadExams(L) {
    if (window.SUMI_KANKEN_EXAMS && window.SUMI_KANKEN_EXAMS[L]) return Promise.resolve(window.SUMI_KANKEN_EXAMS[L]);
    return loadScript('data/kanken-' + L + '.js').then(() => window.SUMI_KANKEN_EXAMS[L]);
  }
  const STROKES = {};
  function loadStrokes(chars) {
    const need = Array.from(new Set(chars.map((c) => KANKEN_OF[c]).filter(Boolean)));
    return Promise.all(need.map((k) => (window.SUMI_DATA && window.SUMI_DATA[k] ? Promise.resolve() : loadScript('data/kanji-' + k + '.js'))))
      .then(() => { chars.forEach((c) => { const k = KANKEN_OF[c]; if (k && window.SUMI_DATA[k][c]) STROKES[c] = window.SUMI_DATA[k][c].p || []; }); });
  }

  // ---------- Hiển thị đề ----------
  function kataBold(s) { return esc(s).replace(/([ァ-ヺー]+)/g, '<b class="kt">$1</b>'); }
  function tokHtml(q) {
    return q.map((t) => {
      if (typeof t === 'string') return esc(t);
      switch (t[0]) {
        case 'u': return '<u class="ul">' + esc(t[1]) + '</u>';
        case 'k': return '<b class="kt">' + esc(t[1]) + '</b>';
        case 'k4': return '<span class="k4">' + kataBold(t[1]) + '</span>';
        case 'arrow': return '<span class="arr">' + (t[1] === '類義語' ? '≒' : '⇔') + '</span>';
        case 'big': return '<span class="bigk">' + esc(t[1]) + '</span>';
        case 'stroke': return strokeSvg(t[1], t[2]);
        default: return '';
      }
    }).join('');
  }
  function strokeSvg(c, hl) {
    const p = STROKES[c] || [];
    if (!p.length) return '<span class="bigk">' + esc(c) + '</span>';
    return '<svg class="stk" viewBox="0 0 109 109">' + p.map((s, i) => '<path d="' + s[0] + '"' + (i === hl ? ' class="hl"' : '') + '/>').join('') + '</svg>';
  }
  function promptHtml(it, sec) {
    if (it.m === 'num') return strokeSvg(it.k, it.hl) + (it.hl < 0 ? '<span class="nq">総画数は？</span>' : '<span class="nq">赤いところは何画目？</span>');
    let h = tokHtml(it.q);
    if (it.hint && (sec.type === 'hantai')) h += ' <span class="hint">（' + esc(it.hint) + '）</span>';
    return h;
  }

  // ---------- Trang chủ Kanken ----------
  function renderHome() {
    document.title = 'Thi thử Kanken – Sumi Kanji';
    let h = '<section class="kk-hero"><div><h2>漢検 模擬試験 <span>Thi thử Kanken</span></h2>' +
      '<p>Đề thi thử <b>đúng cấu trúc đề thật</b> của từng cấp: đúng các dạng bài, số câu, thang điểm, thời gian và điểm đỗ theo tài liệu chính thức của Hiệp hội Kanken. ' +
      'Mỗi cấp có <b>' + N_EXAMS + ' đề</b>, có đồng hồ tính giờ, chấm điểm tự động, đáp án và giải thích.</p>' +
      '<p class="note">ℹ️ Đề thi thật của 日本漢字能力検定協会 có bản quyền nên không được đăng lại. Các đề ở đây do Sumi Kanji tự soạn theo đúng hình thức đề thật. ' +
      'Xem thêm thông tin chính thức tại <a href="https://www.kanken.or.jp/kanken/grades/overview/" target="_blank" rel="noopener">kanken.or.jp</a>.</p></div>' +
      mascotSvg('grad', 'kk-mascot') + '</section><div class="kk-levels">';
    for (const L of LV) {
      const I = INFO[L];
      const exams = [];
      for (let no = 1; no <= N_EXAMS; no++) {
        const r = Sumi.testResult(keyOf(L, no));
        const passed = r && r.best >= I.full * I.pass;
        exams.push('<a class="kk-ex' + (r ? (passed ? ' pass' : ' tried') : '') + '" href="?level=' + L + '&no=' + no + '">第' + no + '回' +
          (r ? '<small>' + r.best + '/' + I.full + (passed ? ' 合格' : '') + '</small>' : '<small>Chưa làm</small>') + '</a>');
      }
      const lockedL = window.SumiPath && !SumiPath.unlocked(L);
      if (lockedL) {
        const pre = SumiPath.prereq(L)[0];
        exams.length = 0;
        exams.push('<span class="kk-locked">🔒 Mở khi hoàn thành ' + esc(SumiPath.short(pre)) + ' trong lộ trình học</span>');
      }
      h += '<article class="kk-lv' + (lockedL ? ' locked' : '') + '"><div class="kk-lv-head"><div class="kk-lv-name">' + I.name + '</div><div class="kk-lv-meta">' +
        '<b>' + esc(I.eq) + '</b><span>' + I.kanji + ' chữ · ' + I.min + ' phút · ' + I.full + ' điểm · đỗ ≈ ' + Math.round(I.full * I.pass) + ' điểm (' + Math.round(I.pass * 100) + '%)</span></div></div>' +
        '<div class="kk-exs">' + exams.join('') + '</div></article>';
    }
    h += '</div>';
    app.innerHTML = h;
  }

  // ---------- Màn giới thiệu đề ----------
  let EX = null, META = null;
  function renderIntro(L, no) {
    const I = INFO[L];
    if (window.SumiPath && !SumiPath.unlocked(L)) {
      app.innerHTML = '<a class="kk-back" href="kanken.html">← Tất cả cấp</a><section class="kk-intro" style="text-align:center"><div style="font-size:3rem">🔒</div>' +
        '<h2>Kanken ' + I.name + ' đang khóa</h2><p>Hoàn thành <b>' + esc(SumiPath.short(SumiPath.prereq(L)[0])) + '</b> trong lộ trình học để mở đề thi thử cấp này.</p>' +
        '<p><a class="kk-btn primary" href="level.html?id=' + (SumiPath.current() || 'g1') + '">▶ Học tiếp lộ trình</a></p></section>';
      return;
    }
    document.title = 'Kanken ' + I.name + ' 第' + no + '回 – Sumi Kanji';
    const ex = EX;
    const sess = store.get(SESSION_KEY, null);
    const canResume = sess && sess.L === L && sess.no === no;
    const r = Sumi.testResult(keyOf(L, no));
    let rows = ex.sections.map((s, i) => '<tr><td>(' + toKanjiNum(i + 1) + ')</td><td><b>' + esc(s.title) + '</b><small>' + esc(s.vi) + '</small></td><td>' + s.items.length +
      '</td><td>' + s.pts + '</td><td>' + s.items.length * s.pts + '</td></tr>').join('');
    app.innerHTML = '<a class="kk-back" href="kanken.html">← Tất cả cấp</a>' +
      '<section class="kk-intro"><div class="kk-paper-title"><div class="kk-badge">' + I.name + '</div><div><h2>漢字検定 ' + I.name + ' 模擬試験 第' + no + '回</h2>' +
      '<p>' + esc(I.eq) + ' · ' + I.min + ' phút · ' + META.full + ' điểm · đỗ khoảng ' + Math.round(META.full * META.pass) + ' điểm trở lên</p></div></div>' +
      '<table class="kk-struct"><thead><tr><th>大問</th><th>Dạng bài</th><th>Số câu</th><th>Điểm/câu</th><th>Tổng</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="2">合計</td><td>' + ex.sections.reduce((a, s) => a + s.items.length, 0) + '</td><td></td><td>' + ex.total + '</td></tr></tfoot></table>' +
      '<div class="kk-opts"><div class="kk-opt"><span>Câu viết chữ Hán (書き取り…) trả lời bằng:</span><div class="seg" id="o-write">' +
      '<button data-v="hand">✍️ Viết tay trên màn hình (tự chấm)</button><button data-v="ime">⌨️ Gõ bằng bộ gõ tiếng Nhật (máy chấm)</button></div></div>' +
      '<label class="kk-chk"><input type="checkbox" id="o-timer"' + (prefs.timer ? ' checked' : '') + '> Tính giờ ' + I.min + ' phút như thi thật (hết giờ tự nộp bài)</label>' +
      '<p class="kk-tip">Câu đọc (読み) gõ hiragana, hoặc gõ romaji sẽ tự đổi sang hiragana (vd: <i>gakkou</i> → がっこう).</p></div>' +
      (r ? '<p class="kk-last">Lần trước: <b>' + r.last + '</b> điểm · cao nhất <b>' + r.best + '</b> (' + r.n + ' lần làm)</p>' : '') +
      '<div class="kk-actions">' + (canResume ? '<button class="kk-btn primary" id="resume">▶ Làm tiếp bài đang dở</button><button class="kk-btn" id="start">↺ Làm lại từ đầu</button>'
        : '<button class="kk-btn primary" id="start">▶ Bắt đầu làm bài</button>') +
      '<a class="kk-btn" href="?level=' + L + '&no=' + no + '&print=q" target="_blank">🖨️ In đề</a>' +
      '<a class="kk-btn" href="?level=' + L + '&no=' + no + '&print=a" target="_blank">📄 Xem / in đáp án</a></div></section>';
    const setSeg = () => document.querySelectorAll('#o-write button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.write));
    setSeg();
    $('o-write').onclick = (e) => { const b = e.target.closest('button'); if (b) { prefs.write = b.dataset.v; store.set(PREF_KEY, prefs); setSeg(); } };
    $('o-timer').onchange = (e) => { prefs.timer = e.target.checked; store.set(PREF_KEY, prefs); };
    $('start').onclick = () => startExam(L, no, null);
    if (canResume) $('resume').onclick = () => startExam(L, no, sess);
  }
  const toKanjiNum = (n) => ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'][n] || n;

  // ---------- Làm bài ----------
  let S = null;
  let timerId = null;
  const qid = (si, qi) => si + '-' + qi;

  function startExam(L, no, sess) {
    S = sess && sess.L === L && sess.no === no ? Object.assign(sess, { hand: {} }) : {
      L, no, write: prefs.write, timer: prefs.timer, answers: {}, hand: {}, sec: 0,
      start: Date.now(), deadline: Date.now() + INFO[L].min * 60000
    };
    if (sess) { S.write = sess.write; if (S.pausedLeft) { S.deadline = Date.now() + S.pausedLeft; S.pausedLeft = null; } }
    document.body.classList.add('in-exam');
    $('kk-bar').hidden = false;
    renderSecNav();
    showSection(S.sec || 0);
    clearInterval(timerId);
    if (S.timer) { timerId = setInterval(tick, 1000); tick(); } else $('kk-timer').textContent = '⏱ không giới hạn';
    window.addEventListener('beforeunload', saveSession);
  }
  function saveSession() {
    if (!S || S.finished) return;
    const copy = Object.assign({}, S, { hand: undefined, pausedLeft: S.timer ? Math.max(0, S.deadline - Date.now()) : null });
    store.set(SESSION_KEY, copy);
  }
  function tick() {
    const left = Math.max(0, S.deadline - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
    $('kk-timer').textContent = '⏱ ' + m + ':' + String(s).padStart(2, '0');
    $('kk-timer').classList.toggle('warn', left < 5 * 60000);
    if (left <= 0) { clearInterval(timerId); alert('Hết giờ! Bài làm sẽ được nộp.'); submit(true); }
  }

  function isAnswered(si, qi) {
    const id = qid(si, qi), it = EX.sections[si].items[qi], v = S.answers[id];
    if (it.m === 'goji') return !!(v && v.pick && (v.fix || S.hand[id]));
    if (it.m === 'kanji' && S.write === 'hand') return !!S.hand[id];
    return v != null && String(v).trim() !== '';
  }
  function renderSecNav() {
    $('kk-secs').innerHTML = EX.sections.map((s, i) => {
      const done = s.items.filter((_, qi) => isAnswered(i, qi)).length;
      return '<button data-s="' + i + '" class="' + (i === S.sec ? 'on' : '') + (done === s.items.length ? ' full' : '') + '" title="' + esc(s.title) + '">' +
        toKanjiNum(i + 1) + '<small>' + done + '/' + s.items.length + '</small></button>';
    }).join('');
    const tot = EX.sections.reduce((a, s) => a + s.items.length, 0);
    const done = EX.sections.reduce((a, s, i) => a + s.items.filter((_, qi) => isAnswered(i, qi)).length, 0);
    $('kk-done').textContent = 'Đã làm ' + done + '/' + tot;
  }
  $('kk-submit').addEventListener('click', () => submit(false));
  $('kk-secs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showSection(Number(b.dataset.s)); });

  function showSection(si) {
    S.sec = si;
    const sec = EX.sections[si];
    const isYojiM = sec.type === 'yojim';
    const yojiSec = EX.sections.find((s) => s.type === 'yoji');
    let h = '<div class="kk-sec-head"><div class="kk-sec-no">(' + toKanjiNum(si + 1) + ')</div><div><h3>' + esc(sec.title) +
      ' <small>' + esc(sec.vi) + ' · ' + sec.items.length + ' câu × ' + sec.pts + ' điểm</small></h3>' +
      '<p class="inst">' + esc(sec.inst) + '</p><p class="inst-vi">' + esc(sec.inst_vi) + '</p></div></div>';
    // Hộp gợi ý hiragana cho 対義語・類義語
    if (sec.type === 'taigi') {
      const hints = sec.items.map((it) => it.hint).sort((a, b) => a.localeCompare(b, 'ja'));
      h += '<div class="kk-hintbox">' + hints.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>';
    }
    if (sec.type === 'kousei') {
      h += '<div class="kk-legend">' + sec.items[0].o.map((o, i) => '<div><b>' + LABELS[i] + '</b> ' + esc(o.replace(/^[ア-オ]\s*/, '')) + '</div>').join('') + '</div>';
    }
    if (isYojiM && yojiSec) {
      h += '<div class="kk-legend yl">' + yojiSec.items.map((y, i) => '<div><b>' + LABELS[i] + '</b> ' + tokHtml(y.q) + '</div>').join('') + '</div>';
    }
    h += '<ol class="kk-qs">' + sec.items.map((it, qi) => qHtml(si, qi, it, sec)).join('') + '</ol>';
    h += '<div class="kk-sec-nav">' + (si > 0 ? '<button class="kk-btn" id="prev-sec">← Phần trước</button>' : '<span></span>') +
      (si < EX.sections.length - 1 ? '<button class="kk-btn primary" id="next-sec">Phần tiếp →</button>' : '<button class="kk-btn primary" id="end-sec">✅ Nộp bài</button>') + '</div>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
    // gắn sự kiện
    app.querySelectorAll('input.kana').forEach((inp) => K.attach(inp));
    app.querySelectorAll('input[data-q]').forEach((inp) => inp.addEventListener('input', () => {
      const id = inp.dataset.q;
      if (inp.dataset.part) { S.answers[id] = Object.assign({}, S.answers[id], { [inp.dataset.part]: inp.value }); }
      else S.answers[id] = inp.value;
      renderSecNav(); saveSession();
    }));
    app.querySelectorAll('.pad').forEach((p) => makePad(p));
    if ($('prev-sec')) $('prev-sec').onclick = () => showSection(si - 1);
    if ($('next-sec')) $('next-sec').onclick = () => showSection(si + 1);
    if ($('end-sec')) $('end-sec').onclick = () => submit(false);
    renderSecNav();
  }

  function qHtml(si, qi, it, sec) {
    const id = qid(si, qi);
    const v = S.answers[id];
    let ans = '';
    if (it.m === 'kana') {
      ans = '<input class="kana ans" data-q="' + id + '" value="' + esc(v || '') + '" placeholder="ひらがな / romaji" autocomplete="off" autocapitalize="off" spellcheck="false">';
    } else if (it.m === 'num') {
      ans = '<input class="ans num" type="number" inputmode="numeric" min="1" max="30" data-q="' + id + '" value="' + esc(v || '') + '" placeholder="số"><span class="unit">画</span>';
    } else if (it.m === 'kanji') {
      ans = S.write === 'hand' ? padHtml(id, it.a.length)
        : '<input class="ans kj" data-q="' + id + '" value="' + esc(v || '') + '" placeholder="漢字" autocomplete="off" spellcheck="false">';
    } else if (it.m === 'choice') {
      const short = sec.type === 'kousei' || sec.type === 'yojim';
      ans = '<div class="opts' + (short ? ' short' : '') + (it.o.length > 5 ? ' many' : '') + '">' + it.o.map((o, i) =>
        '<button class="opt' + (v === i ? ' on' : '') + '" data-q="' + id + '" data-i="' + i + '"><b>' + LABELS[i] + '</b>' + (short ? '' : '<span>' + esc(o) + '</span>') + '</button>').join('') + '</div>';
    } else if (it.m === 'goji') {
      const kanjis = Array.from(new Set(tokText(it.q).split('').filter((ch) => /[一-鿿]/.test(ch))));
      ans = '<div class="goji"><div class="g-row"><span class="g-lab">誤 Chữ sai:</span><div class="g-picks">' + kanjis.map((ch) =>
        '<button class="gp' + (v && v.pick === ch ? ' on' : '') + '" data-q="' + id + '" data-ch="' + ch + '">' + ch + '</button>').join('') + '</div></div>' +
        '<div class="g-row"><span class="g-lab">正 Chữ đúng:</span>' + (S.write === 'hand' ? padHtml(id, 1)
          : '<input class="ans kj" data-q="' + id + '" data-part="fix" value="' + esc((v && v.fix) || '') + '" placeholder="漢字" autocomplete="off">') + '</div></div>';
    }
    return '<li class="kq" id="q-' + id + '"><div class="kq-p">' + promptHtml(it, sec) + '</div><div class="kq-a">' + ans + '</div></li>';
  }
  const tokText = (q) => q.map((t) => (typeof t === 'string' ? t : t[1] || '')).join('');

  app.addEventListener('click', (e) => {
    const o = e.target.closest('.opt[data-q]');
    if (o && S && !S.finished) {
      S.answers[o.dataset.q] = Number(o.dataset.i);
      o.parentElement.querySelectorAll('.opt').forEach((x) => x.classList.toggle('on', x === o));
      renderSecNav(); saveSession();
    }
    const g = e.target.closest('.gp[data-q]');
    if (g && S && !S.finished) {
      S.answers[g.dataset.q] = Object.assign({}, S.answers[g.dataset.q], { pick: g.dataset.ch });
      g.parentElement.querySelectorAll('.gp').forEach((x) => x.classList.toggle('on', x === g));
      renderSecNav(); saveSession();
    }
  });

  // Ô viết tay (mỗi chữ một ô)
  function padHtml(id, n) {
    return '<div class="pad" data-q="' + id + '" style="--n:' + n + '">' + '<i class="pc"></i>'.repeat(n) + '<canvas></canvas><button class="pad-clr" title="Xóa">↺</button></div>';
  }
  function makePad(el) {
    const id = el.dataset.q;
    const cv = el.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2b2522'; ctx.lineWidth = Math.max(2.5, r.height / 26);
      if (S.hand[id]) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = S.hand[id]; }
    };
    requestAnimationFrame(size);
    let draw = false, last = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => { if (S.finished) return; draw = true; last = pos(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last[0], last[1], ctx.lineWidth / 2, 0, 7); ctx.fillStyle = '#2b2522'; ctx.fill(); });
    cv.addEventListener('pointermove', (e) => { if (!draw) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; });
    const up = () => { if (!draw) return; draw = false; S.hand[id] = cv.toDataURL('image/png'); renderSecNav(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    el.querySelector('.pad-clr').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); delete S.hand[id]; renderSecNav(); };
  }

  // ---------- Nộp bài & chấm ----------
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, '');
  function autoGrade(it, v, id) {
    if (it.m === 'kana') { const u = K.kataToHira(K.toHiragana(norm(v), true)); return [it.a].concat(it.alt || []).some((x) => u === K.kataToHira(x)); }
    if (it.m === 'num') return Number(v) === it.a;
    if (it.m === 'choice') return v === it.a;
    if (it.m === 'kanji') {
      if (S.write === 'hand') return S.hand[id] ? null : false;
      return [it.a].concat(it.alt || []).includes(norm(v)) || (it.full && norm(v) === it.full);
    }
    if (it.m === 'goji') {
      const pickOk = v && v.pick === it.w;
      if (!pickOk) return false;
      if (S.write === 'hand') return S.hand[id] ? null : false;
      return norm(v.fix) === it.a;
    }
    return false;
  }

  function submit(force) {
    const tot = EX.sections.reduce((a, s) => a + s.items.length, 0);
    const done = EX.sections.reduce((a, s, i) => a + s.items.filter((_, qi) => isAnswered(i, qi)).length, 0);
    if (!force && done < tot && !confirm('Bạn mới làm ' + done + '/' + tot + ' câu. Nộp bài luôn?')) return;
    clearInterval(timerId);
    S.used = Math.round((Date.now() - S.start) / 60000);
    S.res = {};
    const pending = [];
    EX.sections.forEach((sec, si) => sec.items.forEach((it, qi) => {
      const id = qid(si, qi);
      const r = autoGrade(it, S.answers[id], id);
      S.res[id] = r;
      if (r === null) pending.push([si, qi]);
    }));
    S.finished = true;
    store.del(SESSION_KEY);
    window.removeEventListener('beforeunload', saveSession);
    $('kk-bar').hidden = true;
    document.body.classList.remove('in-exam');
    if (pending.length) selfGrade(pending); else showResult();
  }

  function selfGrade(pending) {
    let h = '<section class="kk-self"><h2>✍️ Tự chấm phần viết tay</h2><p>So sánh chữ bạn viết với đáp án. Chấm ○ nếu đúng hình, đủ nét, đúng とめ・はね・はらい như quy định chấm của Kanken (chữ viết rõ ràng, không viết tắt/viết láu).</p><ol class="kk-sg">';
    pending.forEach(([si, qi]) => {
      const it = EX.sections[si].items[qi], id = qid(si, qi);
      h += '<li data-q="' + id + '"><div class="sg-q"><small>(' + toKanjiNum(si + 1) + ') ' + esc(EX.sections[si].title) + ' – câu ' + (qi + 1) + '</small>' +
        '<div class="sg-p">' + promptHtml(it, EX.sections[si]) + '</div></div>' +
        '<div class="sg-cmp"><img src="' + S.hand[id] + '" alt="Bài viết"><span class="sg-ans">' + esc([it.a].concat(it.alt || []).join('／')) + '</span></div>' +
        '<div class="sg-btns"><button class="ok" data-v="1">○</button><button class="bad" data-v="0">×</button></div></li>';
    });
    h += '</ol><div class="kk-actions"><button class="kk-btn primary" id="sg-done" disabled>Xem kết quả →</button></div></section>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
    const update = () => { $('sg-done').disabled = pending.some(([si, qi]) => S.res[qid(si, qi)] === null); };
    app.querySelectorAll('.kk-sg li').forEach((li) => li.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      S.res[li.dataset.q] = b.dataset.v === '1';
      li.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      update();
    }));
    $('sg-done').onclick = showResult;
  }

  function showResult() {
    const I = INFO[S.L];
    let score = 0, correct = 0;
    const secScores = EX.sections.map((sec, si) => {
      let sc = 0;
      sec.items.forEach((it, qi) => { if (S.res[qid(si, qi)]) { sc += sec.pts; correct++; } });
      score += sc;
      return sc;
    });
    const passMark = Math.round(EX.full * EX.pass);
    const passed = score >= passMark;
    const saved = Sumi.saveTest(keyOf(S.L, S.no), score, correct, EX.full);
    const xp = Sumi.addXP(correct);
    let h = '<a class="kk-back" href="kanken.html">← Tất cả cấp</a><section class="kk-result"><div class="kr-head">' +
      '<div><h2>漢字検定 ' + I.name + ' 模擬試験 第' + S.no + '回</h2><p>Thời gian làm: ' + Math.max(1, S.used) + ' phút · ' + correct + ' câu đúng · +' + correct + '⭐</p></div>' +
      '<div class="kr-score ' + (passed ? 'pass' : 'fail') + '"><b>' + score + '</b><span>/' + EX.full + '</span></div></div>' +
      '<div class="kr-stamp ' + (passed ? 'pass' : 'fail') + '">' + (passed ? '合格 <small>Đỗ! (điểm đỗ ' + passMark + ')</small>' : '不合格 <small>Chưa đỗ – cần thêm ' + (passMark - score) + ' điểm (điểm đỗ ' + passMark + ')</small>') + '</div>' +
      '<table class="kk-struct kr-table"><thead><tr><th>大問</th><th>Dạng bài</th><th>Đúng</th><th>Điểm</th></tr></thead><tbody>' +
      EX.sections.map((sec, si) => {
        const ok = sec.items.filter((_, qi) => S.res[qid(si, qi)]).length;
        const rate = ok / sec.items.length;
        return '<tr class="' + (rate < 0.6 ? 'weak' : '') + '"><td>(' + toKanjiNum(si + 1) + ')</td><td><b>' + esc(sec.title) + '</b><small>' + esc(sec.vi) + '</small></td><td>' + ok + '/' + sec.items.length + '</td><td>' + secScores[si] + '/' + sec.items.length * sec.pts + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="kk-actions"><button class="kk-btn primary" id="rv-wrong">🔍 Xem câu sai</button><button class="kk-btn" id="rv-all">📋 Xem toàn bộ đáp án</button>' +
      '<a class="kk-btn" href="?level=' + S.L + '&no=' + S.no + '">↺ Làm lại đề này</a>' +
      (S.no < N_EXAMS ? '<a class="kk-btn" href="?level=' + S.L + '&no=' + (S.no + 1) + '">Đề tiếp: 第' + (S.no + 1) + '回 →</a>' : '') + '</div>' +
      '<div id="review"></div></section>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
    $('rv-wrong').onclick = () => renderReview(true);
    $('rv-all').onclick = () => renderReview(false);
    if (passed) {
      setTimeout(() => sumiCelebrate({
        title: '🎉 合格！' + score + '/' + EX.full, sub: 'Kanken ' + I.name + ' · đề 第' + S.no + '回' + (saved.isBest && saved.rec.n > 1 ? '<br>Kỷ lục mới!' : ''),
        mascot: 'grad', onClose: () => sumiGoalCelebrate(xp)
      }), 300);
    } else sumiGoalCelebrate(xp);
  }

  function userAnswerHtml(it, id) {
    const v = S.answers[id];
    if (it.m === 'choice') return v == null ? '—' : LABELS[v] + (it.o[v] && it.o[v].length < 12 ? ' ' + esc(it.o[v]) : '');
    if (it.m === 'kanji' && S.write === 'hand') return S.hand[id] ? '<img class="rv-img" src="' + S.hand[id] + '">' : '—';
    if (it.m === 'goji') return (v && v.pick ? esc(v.pick) : '—') + ' → ' + (S.write === 'hand' ? (S.hand[id] ? '<img class="rv-img" src="' + S.hand[id] + '">' : '—') : esc((v && v.fix) || '—'));
    if (it.m === 'kana') return esc(K.toHiragana(norm(v), true) || '—');
    return esc(v == null || v === '' ? '—' : v);
  }
  function correctHtml(it) {
    if (it.m === 'choice') return LABELS[it.a] + ' ' + esc(it.o[it.a].replace(/^[ア-オ]\s*/, '').slice(0, 30));
    if (it.m === 'goji') return esc(it.w) + ' → ' + esc(it.a);
    return esc([it.a].concat(it.alt || []).join('／'));
  }
  // Xem lại bài: từng mục (大問) một, có thể lọc chỉ câu sai
  const RV = { onlyWrong: true, sec: 0 };
  function renderReview(onlyWrong, secIdx) {
    if (onlyWrong != null) RV.onlyWrong = onlyWrong;
    const isBad = (si, qi) => !S.res[qid(si, qi)];
    const counts = EX.sections.map((sec, si) => ({
      wrong: sec.items.filter((_, qi) => isBad(si, qi)).length, total: sec.items.length
    }));
    const visible = EX.sections.map((_, si) => si).filter((si) => !RV.onlyWrong || counts[si].wrong);
    $('rv-wrong').classList.toggle('primary', RV.onlyWrong);
    $('rv-all').classList.toggle('primary', !RV.onlyWrong);
    if (!visible.length) {
      $('review').innerHTML = '<p class="rv-none">🎉 Không có câu sai nào!</p>';
      return;
    }
    if (secIdx != null) RV.sec = secIdx;
    if (!visible.includes(RV.sec)) RV.sec = visible[0];
    const si = RV.sec, sec = EX.sections[si];
    const tabs = '<div class="rv-tabs" role="tablist">' + visible.map((x) =>
      '<button class="rv-tab' + (x === si ? ' on' : '') + (counts[x].wrong ? ' has-bad' : '') + '" data-s="' + x + '">' +
      '<b>' + toKanjiNum(x + 1) + '</b><small>' + (RV.onlyWrong ? counts[x].wrong + ' sai' : (counts[x].total - counts[x].wrong) + '/' + counts[x].total) + '</small></button>').join('') + '</div>';
    const rows = sec.items.map((it, qi) => [it, qi]).filter(([, qi]) => !RV.onlyWrong || isBad(si, qi));
    let h = tabs + '<div class="rv-head"><h3 class="rv-sec">(' + toKanjiNum(si + 1) + ') ' + esc(sec.title) + ' <small>' + esc(sec.vi) + '</small></h3>' +
      '<span class="rv-count">' + (RV.onlyWrong ? rows.length + ' câu sai' : 'Đúng ' + (counts[si].total - counts[si].wrong) + '/' + counts[si].total) + '</span></div>' +
      '<p class="rv-inst">' + esc(sec.inst) + '<br><small>' + esc(sec.inst_vi) + '</small></p><ol class="rv-list">';
    rows.forEach(([it, qi]) => {
      const id = qid(si, qi), ok = S.res[id];
      h += '<li class="' + (ok ? 'ok' : 'bad') + '" value="' + (qi + 1) + '"><div class="rv-p">' + promptHtml(it, sec) + '</div>' +
        '<div class="rv-a"><span class="mine">Bạn: ' + userAnswerHtml(it, id) + '</span><span class="right">Đáp án: <b>' + correctHtml(it) + '</b></span></div>' +
        '<div class="rv-e">' + esc(it.e || '') + (it.tr ? '<i>' + esc(it.tr) + '</i>' : '') +
        (it.c ? ' <a href="dict.html#' + encodeURIComponent(it.c) + '" target="_blank">Tra 「' + esc(it.c) + '」</a>' : '') + '</div></li>';
    });
    h += '</ol>';
    const pos = visible.indexOf(si);
    h += '<div class="rv-pager">' +
      (pos > 0 ? '<button class="kk-btn" data-s="' + visible[pos - 1] + '">← (' + toKanjiNum(visible[pos - 1] + 1) + ') ' + esc(EX.sections[visible[pos - 1]].title) + '</button>' : '<span></span>') +
      (pos < visible.length - 1 ? '<button class="kk-btn primary" data-s="' + visible[pos + 1] + '">(' + toKanjiNum(visible[pos + 1] + 1) + ') ' + esc(EX.sections[visible[pos + 1]].title) + ' →</button>' : '') + '</div>';
    const box = $('review');
    box.innerHTML = h;
    box.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { renderReview(null, Number(b.dataset.s)); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    if (secIdx == null) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  // ---------- Bản in: đề thi / đáp án ----------
  function renderPrint(L, no, kind) {
    const I = INFO[L];
    document.body.classList.add('print-mode');
    document.title = 'Kanken_' + I.name + '_第' + no + '回_' + (kind === 'a' ? '解答' : '問題');
    let h = '<div class="pr-bar no-print"><button class="kk-btn primary" onclick="window.print()">🖨️ In / Lưu PDF</button>' +
      '<a class="kk-btn" href="?level=' + L + '&no=' + no + '&print=' + (kind === 'a' ? 'q' : 'a') + '">' + (kind === 'a' ? 'Xem đề' : 'Xem đáp án') + '</a></div>' +
      '<div class="pr-paper"><div class="pr-head"><h1>漢字検定 ' + I.name + ' 模擬試験 第' + no + '回 ' + (kind === 'a' ? '標準解答' : '') + '</h1>' +
      '<p>Sumi Kanji · ' + I.min + '分 · ' + EX.full + '点満点 · 合格 ' + Math.round(EX.full * EX.pass) + '点程度</p>' +
      (kind === 'q' ? '<p class="pr-name">氏名 ________________　　得点 ______ / ' + EX.full + '</p>' : '') + '</div>';
    EX.sections.forEach((sec, si) => {
      h += '<section class="pr-sec"><h2>（' + toKanjiNum(si + 1) + '）' + esc(sec.title) + ' <small>' + sec.items.length + '問 × ' + sec.pts + '点</small></h2>';
      if (kind === 'q') {
        h += '<p class="pr-inst">' + esc(sec.inst) + '</p>';
        if (sec.type === 'taigi') h += '<div class="kk-hintbox">' + sec.items.map((it) => it.hint).sort().map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>';
        if (sec.type === 'kousei') h += '<div class="kk-legend">' + sec.items[0].o.map((o) => '<div>' + esc(o) + '</div>').join('') + '</div>';
        if (sec.type === 'yojim') { const ys = EX.sections.find((s) => s.type === 'yoji'); h += '<div class="kk-legend yl">' + ys.items.map((y, i) => '<div><b>' + LABELS[i] + '</b> ' + tokHtml(y.q) + '</div>').join('') + '</div>'; }
        h += '<ol class="pr-qs">' + sec.items.map((it) => '<li><span class="pr-p">' + promptHtml(it, sec) + '</span>' +
          (it.m === 'choice' && sec.type !== 'kousei' && sec.type !== 'yojim' ? '<span class="pr-o">' + it.o.map((o, i) => LABELS[i] + ' ' + esc(o)).join('　') + '</span>' : '') +
          '<span class="pr-box"></span></li>').join('') + '</ol>';
      } else {
        h += '<ol class="pr-ans">' + sec.items.map((it) => '<li><b>' + correctHtml(it) + '</b><span>' + esc(it.e || '') + '</span></li>').join('') + '</ol>';
      }
      h += '</section>';
    });
    h += '</div>';
    app.innerHTML = h;
  }

  // ---------- Khởi động ----------
  const L = params.get('level'), no = Number(params.get('no'));
  if (L && INFO[L] && no >= 1 && no <= N_EXAMS) {
    app.innerHTML = '<p class="kk-loading">Đang tải đề…</p>';
    loadExams(L).then((data) => {
      META = data; EX = Object.assign({}, data.exams[no - 1], { full: data.full, pass: data.pass });
      const strokeChars = [];
      EX.sections.forEach((s) => s.items.forEach((it) => {
        if (it.m === 'num') strokeChars.push(it.k);
        (it.q || []).forEach((t) => { if (Array.isArray(t) && t[0] === 'stroke') strokeChars.push(t[1]); });
      }));
      return loadStrokes(strokeChars);
    }).then(() => {
      const pr = params.get('print');
      if (pr === 'q' || pr === 'a') renderPrint(L, no, pr);
      else renderIntro(L, no);
    }).catch((err) => { app.innerHTML = '<p class="kk-loading">' + esc(err.message) + '</p>'; });
  } else renderHome();
})();
