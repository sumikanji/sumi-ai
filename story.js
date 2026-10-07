/*! © 2026 Sumi Kanji */
// ===== Truyện ghi nhớ: điền 10 chữ của màn vào một câu chuyện ngắn =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = window.sumiEsc || ((t) => String(t));
  const params = new URLSearchParams(location.search);
  const levelId = LEVELS[params.get('level')] ? params.get('level') : null;
  const stageNo = Number(params.get('stage')) || 1;
  if (!levelId) { location.href = 'index.html'; return; }
  const P = window.SumiPath;
  if (P && !P.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const stage = P ? P.stages(levelId)[stageNo - 1] : null;
  if (!stage) { location.href = 'level.html?id=' + levelId; return; }
  const IDX = window.SUMI_INDEX || {};
  const KEY = levelId + ':' + stageNo;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hvOf = (c) => (IDX[c] && !IDX[c][0].startsWith('(') ? IDX[c][0] : '');
  const viOf = (c) => (IDX[c] ? IDX[c][1].split(/[;,]/)[0] : '');

  let S = null; // { blanks:[{c,r}], jpParts, viParts, filled:[], active, miss, wrongOn }
  let showHv = true;
  try { showHv = localStorage.getItem('sumiKanji.storyHv') !== '0'; } catch (e) { /* bỏ qua */ }

  // ---------- Phân tích truyện ----------
  // jp: {X|r} ô điền · [X|r] chữ có furigana · còn lại là chữ thường
  function parseJp(src) {
    const parts = [];
    const re = /\{([^|}]+)\|([^}]+)\}|\[([^|\]]+)\|([^\]]+)\]/g;
    let last = 0, m, n = 0;
    while ((m = re.exec(src))) {
      if (m.index > last) parts.push({ t: 'txt', s: src.slice(last, m.index) });
      if (m[1]) parts.push({ t: 'blank', c: m[1], r: m[2], i: n++ });
      else parts.push({ t: 'ruby', s: m[3], r: m[4] });
      last = re.lastIndex;
    }
    if (last < src.length) parts.push({ t: 'txt', s: src.slice(last) });
    return parts;
  }
  function parseVi(src) {
    const parts = [];
    const re = /\[\[([\d,]+):([^\]]+)\]\]/g;
    let last = 0, m;
    while ((m = re.exec(src))) {
      if (m.index > last) parts.push({ s: src.slice(last, m.index) });
      parts.push({ s: m[2], idx: m[1].split(',').map(Number) });
      last = re.lastIndex;
    }
    if (last < src.length) parts.push({ s: src.slice(last) });
    return parts;
  }

  // Màn chưa có truyện: ghép 10 câu ví dụ, mỗi câu một ô
  function fallbackStory(data) {
    let jp = '', vi = '';
    stage.forEach((c, k) => {
      const d = data[c];
      const sn = (d && d.sn || []).find((s) => s[0].some((sg) => typeof sg !== 'string' && sg[0].includes(c)));
      if (!sn) { jp += '{' + c + '|' + ((d && d.kun && d.kun[0]) || (d && d.on && d.on[0]) || '').replace(/[.-]/g, '') + '}。'; vi += '[[' + k + ':' + viOf(c) + ']]. '; return; }
      let used = false;
      jp += sn[0].map((sg) => {
        if (typeof sg === 'string') return sg;
        if (!used && sg[0].includes(c)) {
          used = true;
          const [a, b] = sg[0].split(c);
          // chỉ ô cho chữ cần điền, phần còn lại của từ hiện furigana chung
          return (a ? '[' + a + '|・]' : '') + '{' + c + '|' + sg[1] + '}' + (b ? '[' + b + '|・]' : '');
        }
        return '[' + sg[0] + '|' + sg[1] + ']';
      }).join('') + ' ';
      vi += '[[' + k + ':' + sn[1].replace(/[[\]]/g, '') + ']] ';
    });
    return { title: 'Câu ví dụ màn ' + stageNo, jp, vi, fallback: true };
  }

  // ---------- Hiển thị ----------
  function rubyHtml(p) {
    if (p.r === '・') return esc(p.s);
    return '<ruby>' + esc(p.s) + '<rt>' + esc(p.r) + '</rt></ruby>';
  }
  function drawStory() {
    $('st-jp').innerHTML = S.jp.map((p) => {
      if (p.t === 'txt') return esc(p.s);
      if (p.t === 'ruby') return rubyHtml(p);
      const done = S.filled[p.i];
      if (done) return '<ruby class="fill"><span class="fk' + (S.justFilled === p.i ? ' pop' : '') + '">' + esc(p.c) + '</span><rt>' + esc(p.r) + '</rt></ruby>';
      return '<button class="bl' + (p.i === S.active ? ' on' : '') + (S.wrongOn === p.i ? ' shake' : '') + '" data-i="' + p.i + '" aria-label="Ô ' + (p.i + 1) + '"><span>' + (p.i + 1) + '</span></button>';
    }).join('');
    $('st-vi').innerHTML = S.vi.map((p) => {
      if (!p.idx) return esc(p.s);
      const on = p.idx.includes(S.active) && !S.done;
      const ok = p.idx.every((i) => S.filled[i]);
      return '<mark class="' + (on ? 'on' : ok ? 'ok' : '') + '">' + esc(p.s) + '</mark>';
    }).join('');
    S.justFilled = -1; S.wrongOn = -1;
  }
  function drawBank() {
    $('st-bank').classList.toggle('no-hv', !showHv);
    $('st-hv').setAttribute('aria-pressed', showHv);
    $('st-bank').innerHTML = S.bank.map((c) => {
      const used = S.blanks.every((b, i) => b.c !== c || S.filled[i]);
      return '<button class="tk' + (used ? ' used' : '') + (S.glow === c ? ' glow' : '') + '" data-c="' + c + '"' + (used ? ' disabled' : '') + '><b>' + c + '</b><small>' + esc(hvOf(c)) + '</small></button>';
    }).join('');
    const n = S.filled.filter(Boolean).length;
    $('top-xp').textContent = n + '/' + S.blanks.length;
    $('st-miss').textContent = 'Sai ' + S.miss;
    $('st-prog').innerHTML = '<i style="width:' + (n / S.blanks.length * 100) + '%"></i>';
  }
  function say(mood, msg) {
    $('st-hiyo').innerHTML = HIYO.svg(currentForm(), mood, { cls: 'st-hiyo' });
    $('st-msg').innerHTML = msg;
  }
  function nextActive(from) {
    const n = S.blanks.length;
    for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (!S.filled[i]) return i; }
    return -1;
  }

  // ---------- Chơi ----------
  function start(story) {
    const jp = parseJp(story.jp);
    const blanks = jp.filter((p) => p.t === 'blank');
    S = { story, jp, vi: parseVi(story.vi), blanks, filled: blanks.map(() => false), active: 0, miss: 0, wrongStreak: 0, glow: null, done: false, justFilled: -1, wrongOn: -1 };
    S.bank = shuffle(Array.from(new Set(blanks.map((b) => b.c))));
    $('st-title').textContent = story.title;
    $('st-play').hidden = false;
    $('st-end').hidden = true;
    say('happy', story.fallback
      ? 'Màn này chưa có truyện riêng, nên mình ghép <b>câu ví dụ</b> của các chữ trong màn. Điền chữ vào ô đang sáng nhé!'
      : 'Cùng đọc truyện và điền <b>' + blanks.length + ' chữ</b> vừa học vào ô trống! Nhìn phần nghĩa tiếng Việt đang sáng để đoán chữ.');
    drawStory(); drawBank();
  }
  $('st-jp').addEventListener('click', (e) => {
    const b = e.target.closest('.bl'); if (!b || S.done || b.classList.contains('done')) return;
    S.active = Number(b.dataset.i); S.wrongStreak = 0; S.glow = null;
    drawStory(); drawBank();
  });
  $('st-bank').addEventListener('click', (e) => {
    const t = e.target.closest('.tk'); if (!t || S.done || t.disabled) return;
    const want = S.blanks[S.active];
    if (t.dataset.c === want.c) {
      S.filled[S.active] = true; S.justFilled = S.active; S.wrongStreak = 0; S.glow = null;
      const left = S.filled.filter((x) => !x).length;
      if (!left) return finish();
      say(left <= 3 ? 'cheer' : 'happy', '○ <b>' + want.c + '</b> (' + esc(hvOf(want.c)) + ') đọc là <b>' + esc(want.r) + '</b>. Còn ' + left + ' ô nữa!');
      S.active = nextActive(S.active);
    } else {
      S.miss++; S.wrongStreak++; S.wrongOn = S.active;
      t.classList.add('shake');
      if (S.wrongStreak >= 2) { S.glow = want.c; say('think', 'Gợi ý: chữ cần điền có âm Hán Việt là <b>' + esc(hvOf(want.c)) + '</b>, nghĩa “' + esc(viOf(want.c)) + '”. Chữ đó đang nhấp nháy!'); }
      else say('sad', '「' + t.dataset.c + '」 là <b>' + esc(hvOf(t.dataset.c)) + '</b> – chưa đúng ô này. Thử lại nhé!');
    }
    drawStory(); drawBank();
  });
  $('st-hv').addEventListener('click', () => {
    showHv = !showHv;
    try { localStorage.setItem('sumiKanji.storyHv', showHv ? '1' : '0'); } catch (e) { /* bỏ qua */ }
    drawBank();
  });

  // ---------- Kết thúc ----------
  function finish() {
    S.done = true; S.active = -1;
    drawStory(); drawBank();
    $('st-play').hidden = true;
    const stars = S.miss <= 1 ? 3 : S.miss <= 4 ? 2 : 1;
    const st = Sumi.load();
    st.stories = st.stories || {};
    const prev = st.stories[KEY] || 0;
    if (stars > prev) st.stories[KEY] = stars;
    Sumi.save();
    const xp = Sumi.addXP(5);
    say(stars === 3 ? 'joy' : 'cheer', stars === 3 ? 'Tuyệt vời! Bạn nhớ hết ' + S.blanks.length + ' chữ rồi. Giờ đọc to cả truyện 3 lần nhé!' : 'Hoàn thành! Đọc to cả truyện vài lần để nhớ thật lâu nhé.');
    const info = P.stageInfo(levelId);
    const nx = info[stageNo];
    const goNext = nx && nx.needMid ? ['test.html?level=' + levelId + '&n=mid', '📝 Kiểm tra giữa cấp']
      : !nx && !P.cleared(levelId) && P.allStagesDone(levelId) ? ['test.html?level=' + levelId + '&n=all', '🏯 Vào thi tổng hợp']
        : ['level.html?id=' + levelId, nx && nx.status !== 'locked' ? '▶ Học màn ' + nx.no : '🗺 Về lộ trình'];
    const canSpeak = 'speechSynthesis' in window;
    $('st-end').innerHTML =
      '<div class="se-stars">' + [1, 2, 3].map((n) => '<span class="' + (n <= stars ? 'on' : '') + '">⭐</span>').join('') + '</div>' +
      '<p class="se-sub">Sai ' + S.miss + ' lần · +' + 5 + '⭐' + (xp && xp.total != null ? ' · hôm nay ' + xp.total + '/' + xp.goal : '') + '</p>' +
      '<div class="se-words">' + S.blanks.map((b) => '<span><b>' + b.c + '</b><small>' + esc(hvOf(b.c)) + '</small></span>').join('') + '</div>' +
      '<div class="se-acts">' +
        (canSpeak ? '<button class="act-btn" id="se-read">🔊 Nghe đọc truyện</button>' : '') +
        '<button class="act-btn" id="se-again">↺ Chơi lại</button>' +
        '<a class="act-btn primary" href="' + goNext[0] + '">' + goNext[1] + '</a>' +
      '</div>';
    $('st-end').hidden = false;
    $('se-again').onclick = () => start(S.story);
    if (canSpeak) $('se-read').onclick = speak;
    if (xp && xp.goalJustMet && window.sumiGoalCelebrate) sumiGoalCelebrate(xp);
  }
  function speak() {
    const text = S.jp.map((p) => (p.t === 'txt' ? p.s : p.t === 'blank' ? p.c : p.s)).join('');
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 0.85;
      speechSynthesis.speak(u);
    } catch (e) { /* bỏ qua */ }
  }

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  $('top-title').textContent = '📖 Truyện ghi nhớ · Màn ' + stageNo;
  document.title = 'Truyện ghi nhớ màn ' + stageNo + ' – ' + levelName + ' – Sumi Kanji';
  const story = (window.SUMI_STORIES || {})[KEY];
  if (story) start(story);
  else sumiLoadLevel(levelId).then((d) => start(fallbackStory(d))).catch((err) => say('sad', esc(err.message)));
})();
