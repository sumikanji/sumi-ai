// ===== Flashcard: lật thẻ, chia 2 chồng "đã nhớ / chưa nhớ", lặp lại chồng chưa nhớ =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = sumiEsc;
  const params = new URLSearchParams(location.search);
  const levelId = LEVELS[params.get('level')] ? params.get('level') : null;
  if (!levelId) { location.href = 'index.html'; return; }
  if (window.SumiPath && !SumiPath.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const PREF_KEY = 'sumiKanji.flashPrefs';
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let prefs = { scope: 'all', front: 'kanji' };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch (e) { /* bỏ qua */ }
  if (!['all', 'todo', 'learned', 'fav'].includes(prefs.scope)) prefs.scope = 'all';
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* bỏ qua */ } };

  let data = {};
  let queue = [], pos = 0, okPile = [], badPile = [], history = [], roundNo = 1;
  let flipped = false;
  let wordOf = {}; // từ vựng chọn cho mặt trước kiểu "từ vựng"

  const ORIGIN = { T: '象形 Tượng hình', C: '指事 Chỉ sự', H: '会意 Hội ý', F: '形声 Hình thanh', K: '国字 Chữ Nhật tạo', V: 'Khác' };

  // ---------- Dựng mặt thẻ ----------
  function frontHtml(c) {
    const d = data[c];
    if (prefs.front === 'mean') {
      return '<div class="ff-label">Chữ Hán nào?</div><div class="ff-hv">' + esc(d.hv.startsWith('(') ? '' : d.hv) + '</div>' +
        '<div class="ff-vi">' + esc(d.vi) + '</div><div class="ff-en">' + esc(d.en || '') + '</div>';
    }
    if (prefs.front === 'word') {
      const w = wordOf[c];
      return '<div class="ff-label">Đọc từ này thế nào? Nghĩa là gì?</div><div class="ff-word">' + esc(w[0]) + '</div>';
    }
    return '<div class="ff-label">Âm Hán Việt? Nghĩa? Cách đọc?</div><div class="ff-kanji">' + c + '</div>';
  }

  function backHtml(c) {
    const d = data[c];
    let h = '<div class="fb-top"><div class="fb-k">' + c + '</div><div class="fb-meta">' +
      '<div class="fb-hv">' + esc(d.hv.startsWith('(') ? '' : d.hv) + '</div><div class="fb-vi">' + esc(d.vi) + '</div>' +
      '<div class="fb-en">' + esc(d.en || '') + '</div></div></div>';
    if (prefs.front === 'word') {
      const w = wordOf[c];
      h += '<div class="fb-focus"><b>' + esc(w[0]) + '</b> <span>' + esc(w[1]) + '</span><div>' + esc(w[3]) + (w[4] ? ' <i>· ' + esc(w[4]) + '</i>' : '') + '</div></div>';
    }
    const on = (d.on || []).slice(0, 3), kun = Array.from(new Set((d.kun || []).map(sumiKun))).slice(0, 3);
    h += '<div class="fb-reads">' +
      (on.length ? '<span class="lab">音</span>' + on.map((r) => '<span class="rd on">' + esc(r) + '</span>').join('') : '') +
      (kun.length ? '<span class="lab">訓</span>' + kun.map((r) => '<span class="rd kun">' + esc(r) + '</span>').join('') : '') + '</div>';
    const words = (d.w || []).filter((w) => !(prefs.front === 'word' && w === wordOf[c])).slice(0, 3);
    if (words.length) {
      h += '<ul class="fb-words">' + words.map((w) => '<li><b>' + esc(w[0]) + '</b> <span>' + esc(w[1]) + '</span> – ' + esc(w[3]) +
        (w[4] ? ' <i>· ' + esc(w[4]) + '</i>' : '') + '</li>').join('') + '</ul>';
    }
    if (d.o) {
      const parts = d.o[1] || [];
      h += '<div class="fb-origin"><span class="lab">' + ORIGIN[d.o[0]] + '</span>' +
        (parts.length ? ' <b>' + parts.map((p) => p[0]).join(' + ') + ' → ' + c + '</b>' : '') + '<p>' + esc(d.o[2]) + '</p></div>';
    }
    return h;
  }

  // ---------- Hiển thị ----------
  function render() {
    const total = okPile.length + badPile.length + (queue.length - pos);
    $('top-count').textContent = Math.min(pos + 1, queue.length) + ' / ' + queue.length + (roundNo > 1 ? ' · lượt ' + roundNo : '');
    $('n-ok').textContent = okPile.length;
    $('n-bad').textContent = badPile.length;
    $('n-left').textContent = queue.length - pos;
    $('fc-bar').style.width = (total ? (okPile.length + badPile.length) / queue.length * 100 : 0) + '%';
    $('btn-undo').disabled = !history.length;
    if (pos >= queue.length) return endRound();
    $('fc-stage').hidden = false;
    $('fc-end').hidden = true;
    const c = queue[pos];
    flipped = false;
    $('fc-card').classList.remove('flipped', 'go-left', 'go-right');
    $('fc-card').style.transform = '';
    $('fc-front').innerHTML = frontHtml(c);
    $('fc-back').innerHTML = backHtml(c);
    $('fc-back').scrollTop = 0;
    drawFavBtn();
  }

  // ---------- Chữ yêu thích ----------
  let pickFolded = false;
  function drawFavBtn() {
    const c = queue[pos];
    const on = c && SumiFav.has(c);
    $('btn-fav').innerHTML = on ? '❤️ Đã thích' : '🤍 Yêu thích';
    $('btn-fav').classList.toggle('on', !!on);
  }
  function scopeCounts() {
    document.querySelectorAll('#opt-scope button').forEach((b) => {
      b.dataset.base = b.dataset.base || b.innerHTML;
      b.innerHTML = b.dataset.base + ' <small>' + sumiScopeChars(levelId, b.dataset.v).length + '</small>';
    });
  }
  function renderPick() {
    scopeCounts();
    const on = prefs.scope === 'fav';
    $('pick').hidden = !on;
    if (!on) return;
    const all = levelChars(levelId).filter((c) => data[c]);
    const learned = loadLearned();
    $('pick-count').textContent = 'Đã chọn ' + all.filter((c) => SumiFav.has(c)).length + '/' + all.length + ' chữ';
    $('pick-grid').hidden = pickFolded;
    $('pick-fold').textContent = pickFolded ? 'Mở rộng ▼' : 'Thu gọn ▲';
    $('pick-grid').innerHTML = all.map((c) => '<button class="pk' + (SumiFav.has(c) ? ' on' : '') + (learned[c] ? ' lr' : '') + '" data-c="' + c + '" title="' + esc(data[c].hv) + ' – ' + esc(data[c].vi) + '"><b>' + c + '</b><small>' + esc((data[c].hv || '').split(/[\s/]/)[0]) + '</small></button>').join('');
  }
  $('pick-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.pk'); if (!b) return;
    SumiFav.toggle(b.dataset.c); renderPick(); roundNo = 1; start();
  });
  document.querySelector('.pick-acts').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'fold') { pickFolded = !pickFolded; renderPick(); return; }
    const all = levelChars(levelId).filter((c) => data[c]);
    if (b.dataset.a === 'all') SumiFav.setMany(all, true);
    else if (b.dataset.a === 'none') SumiFav.setMany(all, false);
    else { const l = loadLearned(); SumiFav.setMany(all, false); SumiFav.setMany(all.filter((c) => l[c]), true); }
    renderPick(); roundNo = 1; start();
  });
  function toggleFav() {
    const c = queue[pos]; if (!c) return;
    SumiFav.toggle(c); drawFavBtn(); renderPick();
  }

  function flip() {
    flipped = !flipped;
    $('fc-card').classList.toggle('flipped', flipped);
  }

  function mark(ok) {
    if (pos >= queue.length) return;
    const c = queue[pos];
    (ok ? okPile : badPile).push(c);
    history.push({ c, ok });
    const card = $('fc-card');
    card.classList.add(ok ? 'go-right' : 'go-left');
    pos++;
    setTimeout(render, 220);
  }

  function undo() {
    if (!history.length) return;
    const h = history.pop();
    (h.ok ? okPile : badPile).pop();
    pos--;
    render();
  }

  function endRound() {
    $('fc-stage').hidden = true;
    const end = $('fc-end');
    end.hidden = false;
    const n = okPile.length + badPile.length;
    const all = badPile.length === 0;
    end.innerHTML = mascotSvg(all ? 'cheer' : 'book', 'big-mascot') +
      '<h1>' + (all ? '🎉 Nhớ hết ' + n + ' thẻ!' : 'Xong lượt ' + roundNo + '!') + '</h1>' +
      '<div class="end-stats"><div class="stat"><b>' + okPile.length + '</b><span>😊 Đã nhớ</span></div>' +
      '<div class="stat"><b>' + badPile.length + '</b><span>😕 Chưa nhớ</span></div></div>' +
      (badPile.length ? '<div class="end-list"><h3>Thẻ chưa nhớ</h3><div class="chips">' +
        badPile.map((c) => '<a class="chip-k bad" href="level.html?id=' + (gradeLevelOf(c) || levelId) + '&k=' + encodeURIComponent(c) + '">' + c +
          ' <small>' + esc(data[c].vi) + '</small></a>').join('') + '</div></div>' : '') +
      '<div class="start-actions">' +
      (badPile.length ? '<button class="act-btn primary" id="again-bad">↺ Ôn lại ' + badPile.length + ' thẻ chưa nhớ</button>' : '') +
      '<button class="act-btn' + (badPile.length ? '' : ' primary') + '" id="again-all">🔀 Làm lại tất cả</button>' +
      '<a class="act-btn" href="level.html?id=' + levelId + '">← ' + esc(levelName) + '</a></div>';
    if ($('again-bad')) $('again-bad').onclick = () => { roundNo++; start(shuffle(badPile)); };
    $('again-all').onclick = () => { roundNo = 1; start(); };
    if (all && n >= 5) sumiCelebrate({ title: '🃏 Nhớ hết rồi!', sub: n + ' thẻ · ' + esc(levelName), mascot: 'cheer' });
  }

  function start(list) {
    let chars = list || shuffle(sumiScopeChars(levelId, prefs.scope));
    if (!chars.length) {
      $('fc-stage').hidden = true;
      $('fc-end').hidden = false;
      const msg = { todo: 'Bạn đã học hết chữ của cấp này!', learned: 'Chưa có chữ nào đã học. Hãy học vài chữ trước nhé.', fav: 'Chưa có chữ yêu thích nào. Bấm vào các chữ ở khung phía trên để chọn nhé!' }[prefs.scope] || 'Không có chữ nào.';
      $('fc-end').innerHTML = mascotSvg('think', 'big-mascot') + '<h1>' + msg + '</h1><div class="start-actions"><button class="act-btn primary" id="to-all">Xem tất cả chữ</button></div>';
      $('to-all').onclick = () => { prefs.scope = 'all'; savePrefs(); syncSeg(); start(); };
      ['n-ok', 'n-bad', 'n-left'].forEach((id) => { $(id).textContent = 0; });
      $('top-count').textContent = '0 / 0';
      return;
    }
    wordOf = {};
    chars.forEach((c) => {
      const ws = (data[c].w || []).filter((w) => w[0].includes(c));
      wordOf[c] = ws.length ? ws[Math.floor(Math.random() * ws.length)] : [c, (data[c].kun[0] || data[c].on[0] || '').replace(/[.-]/g, ''), '', data[c].vi, data[c].en];
    });
    queue = chars; pos = 0; okPile = []; badPile = []; history = [];
    render();
  }

  // ---------- Đọc to ----------
  const canSpeak = 'speechSynthesis' in window;
  if (!canSpeak) $('btn-speak').hidden = true;
  function speak() {
    if (!canSpeak || pos >= queue.length) return;
    const c = queue[pos], d = data[c];
    let text;
    if (prefs.front === 'word') text = wordOf[c][1];
    else text = (d.w && d.w[0]) ? d.w[0][1] : (d.kun[0] || d.on[0] || c).replace(/[.-]/g, '');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('ja'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- Thao tác ----------
  $('btn-flip').onclick = flip;
  $('btn-ok').onclick = () => mark(true);
  $('btn-bad').onclick = () => mark(false);
  $('btn-undo').onclick = undo;
  $('btn-speak').onclick = speak;
  $('btn-shuffle').onclick = () => { roundNo = 1; start(); };

  // Chạm để lật, vuốt để chọn
  const card = $('fc-card');
  let sx = null, sy = 0, dx = 0, moved = false;
  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.fc-back') && flipped && e.pointerType === 'mouse' && e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; dx = 0; moved = false;
  });
  card.addEventListener('pointermove', (e) => {
    if (sx == null) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) {
      moved = true;
      card.style.transition = 'none';
      card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 20 + 'deg)';
      card.classList.toggle('lean-right', dx > 40);
      card.classList.toggle('lean-left', dx < -40);
    }
  });
  const endDrag = () => {
    if (sx == null) return;
    card.style.transition = '';
    card.classList.remove('lean-left', 'lean-right');
    if (moved && Math.abs(dx) > 90) mark(dx > 0);
    else { card.style.transform = ''; if (!moved) flip(); }
    sx = null;
  };
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', () => { sx = null; card.style.transition = ''; card.style.transform = ''; });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    if (!$('fc-stage').hidden) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowRight') mark(true);
      else if (e.key === 'ArrowLeft') mark(false);
      else if (e.key === 'z' || e.key === 'Z') undo();
      else if (e.key === 's' || e.key === 'S') speak();
      else if (e.key === 'f' || e.key === 'F') toggleFav();
    }
  });

  // ---------- Tùy chọn ----------
  function syncSeg() {
    document.querySelectorAll('#opt-scope button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.scope));
    document.querySelectorAll('#opt-front button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.front));
  }
  $('opt-scope').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    prefs.scope = b.dataset.v; savePrefs(); syncSeg(); renderPick(); roundNo = 1; start();
  });
  $('opt-front').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    prefs.front = b.dataset.v; savePrefs(); syncSeg(); if (pos < queue.length) render();
  });

  // ---------- Khởi động ----------
  document.title = 'Flashcard – ' + levelName + ' – Sumi Kanji';
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  syncSeg();
  $('btn-fav').onclick = toggleFav;
  scopeCounts();
  sumiLoadLevel(levelId).then((d) => { data = d; renderPick(); start(); })
    .catch((err) => { $('fc-front').textContent = err.message; });
})();
