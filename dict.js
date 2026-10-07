// ===== Từ điển Kanji: tìm kiếm, lọc, xem chi tiết toàn bộ 2.136 chữ =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = sumiEsc;
  const IDX = window.SUMI_INDEX || {};     // chữ → [HV, nghĩa Việt, nghĩa Anh]
  const DICT = window.SUMI_DICT || {};     // chữ → [On, Kun, số nét, số bộ, cấp Kanken]
  const RADS = window.SUMI_RADICALS || []; // [chữ bộ, tên HV, tên Nhật, biến thể, tên Nhật biến thể]
  const K = SumiKana;
  const KANKEN_ORDER = ['k10', 'k9', 'k8', 'k7', 'k6', 'k5', 'k4', 'k3', 'k2s', 'k2'];
  const KANKEN_NAME = { k10: '10級', k9: '9級', k8: '8級', k7: '7級', k6: '6級', k5: '5級', k4: '4級', k3: '3級', k2s: '準2級', k2: '2級' };
  const GRADE_OF = { k10: 'g1', k9: 'g2', k8: 'g3', k7: 'g4', k6: 'g5', k5: 'g6', k4: 'thcs', k3: 'thcs', k2s: 'thpt', k2: 'thpt' };
  const GRADE_NAME = { g1: 'Lớp 1', g2: 'Lớp 2', g3: 'Lớp 3', g4: 'Lớp 4', g5: 'Lớp 5', g6: 'Lớp 6', thcs: 'THCS', thpt: 'THPT' };
  const ORIGIN = { T: ['象形', 'Tượng hình'], C: ['指事', 'Chỉ sự'], H: ['会意', 'Hội ý'], F: ['形声', 'Hình thanh'], K: ['国字', 'Chữ Nhật tạo'], V: ['仮借・他', 'Khác'] };
  const PART_COLORS = ['#e8590c', '#1c7ed6', '#2b8a3e', '#c2255c', '#7048e8', '#0c8599'];
  const ROLE = { n: 'gợi nghĩa', a: 'gợi âm', h: 'nghĩa + âm' };

  const ALL = Object.keys(DICT);
  const orderIdx = {}; ALL.forEach((c, i) => { orderIdx[c] = i; });
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const isKanji = (ch) => /[一-鿿々]/.test(ch);

  // Chuẩn bị chỉ mục tìm kiếm
  const SI = {};
  for (const c of ALL) {
    const [hv, vi, en] = IDX[c] || ['', '', ''];
    const [on, kun] = DICT[c];
    SI[c] = {
      hv: fold(hv), hvRaw: hv.toLowerCase(), vi: fold(vi), viRaw: vi.toLowerCase(), en: (en || '').toLowerCase(),
      on: K.kataToHira(on).split('・').filter(Boolean),
      kun: kun.split('・').filter(Boolean).map((r) => r.replace(/[-]/g, '')),
    };
  }

  // ---------- Trạng thái ----------
  const state = { q: '', level: '', strokes: '', radical: '', sort: 'level', learned: false, limit: 240 };
  let results = [];
  let learnedMap = loadLearned();

  // ---------- Bộ lọc ----------
  $('f-level').innerHTML = '<button data-v="" class="on">Tất cả</button>' +
    Object.keys(GRADE_NAME).map((g) => '<button data-v="' + g + '">' + GRADE_NAME[g] + '</button>').join('') +
    '<span class="sep"></span>' + KANKEN_ORDER.map((k) => '<button data-v="' + k + '" class="kk">' + KANKEN_NAME[k] + '</button>').join('');
  const maxS = Math.max(...ALL.map((c) => DICT[c][2]));
  for (let s = 1; s <= maxS; s++) {
    const n = ALL.filter((c) => DICT[c][2] === s).length;
    if (n) $('f-strokes').insertAdjacentHTML('beforeend', '<option value="' + s + '">' + s + ' nét (' + n + ')</option>');
  }
  const radCount = {};
  ALL.forEach((c) => { radCount[DICT[c][3]] = (radCount[DICT[c][3]] || 0) + 1; });
  RADS.forEach((r, i) => {
    if (radCount[i]) {
      $('f-radical').insertAdjacentHTML('beforeend', '<option value="' + i + '">' + r[0] + (r[3] ? ' ' + r[3].replace(/\(.*\)/, '') : '') +
        ' – ' + r[1] + ' · ' + (r[4] || r[2]) + ' (' + radCount[i] + ')</option>');
    }
  });

  // ---------- Tìm kiếm ----------
  function score(c, q) {
    const s = SI[c];
    if (!q) return 0;
    if (q.kanji) return q.kanji.includes(c) ? 100 - q.kanji.indexOf(c) * 0.01 : -1;
    let best = -1;
    const t = q.text;
    if (t) {
      // Hán Việt
      const hvs = s.hv.split(/\s*\/\s*|\s+/);
      if (s.hvRaw === q.raw) best = Math.max(best, 95);
      if (hvs.includes(t)) best = Math.max(best, 90);
      else if (t.length >= 2 && s.hv.startsWith(t)) best = Math.max(best, 60);
      // Nghĩa Việt
      const vis = s.vi.split(/[;,]\s*/);
      if (vis.includes(t)) best = Math.max(best, 85);
      else if (t.length >= 2 && s.vi.includes(t)) best = Math.max(best, s.viRaw.includes(q.raw) ? 55 : 45);
      // Tiếng Anh
      const ens = s.en.split(/,\s*/);
      if (ens.includes(q.raw)) best = Math.max(best, 80);
      else if (q.raw.length >= 3 && ens.some((e) => e.split(/\s+/).includes(q.raw))) best = Math.max(best, 50);
    }
    // Cách đọc (kana hoặc romaji)
    if (q.kana) {
      const h = q.kana;
      if (s.on.includes(h)) best = Math.max(best, 88);
      if (s.kun.some((r) => r.replace('.', '') === h || r.split('.')[0] === h)) best = Math.max(best, 88);
      else if (h.length >= 2 && s.kun.some((r) => r.replace('.', '').startsWith(h))) best = Math.max(best, 40);
      else if (h.length >= 2 && s.on.some((r) => r.startsWith(h))) best = Math.max(best, 38);
    }
    return best;
  }

  function parseQuery(raw) {
    raw = raw.trim();
    if (!raw) return null;
    const kanji = Array.from(raw).filter(isKanji);
    if (kanji.length) return { kanji };
    const q = { raw: raw.toLowerCase(), text: fold(raw) };
    if (/^[぀-ヿ]+$/.test(raw)) { q.kana = K.kataToHira(raw); q.text = ''; }
    else if (K.isRomaji(raw)) { const h = K.toHiragana(raw, true); if (/^[぀-ゟー]+$/.test(h)) q.kana = h; }
    return q;
  }

  function levelMatch(c) {
    if (!state.level) return true;
    const k = DICT[c][4];
    return state.level.startsWith('k') ? k === state.level : GRADE_OF[k] === state.level;
  }

  function run() {
    const q = parseQuery(state.q);
    let list = [];
    for (const c of ALL) {
      if (!levelMatch(c)) continue;
      if (state.strokes && DICT[c][2] !== Number(state.strokes)) continue;
      if (state.radical !== '' && DICT[c][3] !== Number(state.radical)) continue;
      if (state.learned && !learnedMap[c]) continue;
      const sc = q ? score(c, q) : 0;
      if (q && sc < 0) continue;
      list.push([c, sc]);
    }
    const hvKey = (c) => fold((IDX[c] || [''])[0]);
    const sorter = {
      level: (a, b) => orderIdx[a[0]] - orderIdx[b[0]],
      strokes: (a, b) => DICT[a[0]][2] - DICT[b[0]][2] || orderIdx[a[0]] - orderIdx[b[0]],
      radical: (a, b) => DICT[a[0]][3] - DICT[b[0]][3] || DICT[a[0]][2] - DICT[b[0]][2],
      hv: (a, b) => hvKey(a[0]).localeCompare(hvKey(b[0]), 'vi')
    }[state.sort];
    list.sort((a, b) => (q ? b[1] - a[1] : 0) || sorter(a, b));
    results = list.map((x) => x[0]);
    render();
  }

  function render() {
    const n = results.length;
    const q = state.q.trim();
    $('dict-meta').innerHTML = n
      ? '<b>' + n + '</b> chữ' + (q ? ' cho “' + esc(q) + '”' : '') + (state.q && parseQuery(state.q) && parseQuery(state.q).kana ? ' · đọc là <span class="jp">' + esc(parseQuery(state.q).kana) + '</span>' : '')
      : 'Không tìm thấy chữ nào. Thử gõ Hán Việt không dấu (vd: <i>hoc</i>), nghĩa tiếng Việt, tiếng Anh hoặc cách đọc (vd: <i>gaku</i>).';
    const show = results.slice(0, state.limit);
    $('dict-grid').innerHTML = show.map((c) => {
      const [hv, vi] = IDX[c] || ['', ''];
      return '<button class="dt' + (learnedMap[c] ? ' learned' : '') + '" data-k="' + c + '"><span class="dt-k">' + c + '</span>' +
        '<span class="dt-hv">' + esc(hv.startsWith('(') ? '' : hv) + '</span><span class="dt-vi">' + esc(vi) + '</span>' +
        '<span class="dt-lv">' + KANKEN_NAME[DICT[c][4]] + '</span></button>';
    }).join('');
    $('more-btn').hidden = n <= state.limit;
    $('more-btn').textContent = 'Xem thêm (' + (n - state.limit) + ' chữ)';
  }

  // ---------- Chi tiết ----------
  const loaded = {};
  function loadKanken(k) {
    if (loaded[k]) return loaded[k];
    loaded[k] = new Promise((resolve, reject) => {
      if (window.SUMI_DATA && window.SUMI_DATA[k]) return resolve(window.SUMI_DATA[k]);
      const s = document.createElement('script');
      s.src = 'data/kanji-' + k + '.js';
      s.onload = () => resolve(window.SUMI_DATA[k]);
      s.onerror = () => reject(new Error('Không tải được dữ liệu'));
      document.head.appendChild(s);
    });
    return loaded[k];
  }

  let current = null;
  let anim = null;
  function openDetail(c, push) {
    current = c;
    $('dd').hidden = false;
    document.body.classList.add('no-scroll');
    $('dd-body').innerHTML = '<div class="dd-loading">Đang tải…</div>';
    updateNav();
    loadKanken(DICT[c][4]).then((data) => { if (current === c) fillDetail(c, data[c]); });
    if (push !== false) history.replaceState(null, '', '#' + encodeURIComponent(c));
  }
  function closeDetail() {
    $('dd').hidden = true;
    document.body.classList.remove('no-scroll');
    clearInterval(anim);
    current = null;
    history.replaceState(null, '', location.pathname + location.search);
  }
  function updateNav() {
    const i = results.indexOf(current);
    $('dd-pos').textContent = i >= 0 ? (i + 1) + ' / ' + results.length : '';
    $('dd-prev').disabled = i <= 0;
    $('dd-next').disabled = i < 0 || i >= results.length - 1;
  }
  function go(d) {
    const i = results.indexOf(current);
    if (i >= 0 && results[i + d]) openDetail(results[i + d]);
  }

  function relatedTiles(list) {
    return list.map((x) => '<button class="rel" data-k="' + x + '"><b>' + x + '</b><small>' + esc((IDX[x] || [''])[0]) + '</small></button>').join('');
  }

  function fillDetail(c, d) {
    const [onS, kunS, strokes, radN, kk] = DICT[c];
    const rad = RADS[radN] || [];
    const grade = GRADE_OF[kk];
    const radName = rad.length ? rad[0] + (d.r && d.r[2] ? ' (' + d.r[2] + ')' : '') + ' – ' + rad[1] + ' · ' + (d.r && d.r[2] && rad[4] ? rad[4] : rad[2]) : '';
    const learned = learnedMap[c];
    const card = Sumi.card(c);
    let h = '<div class="dd-head">' +
      '<div class="dd-k-wrap"><svg class="dd-svg" id="dd-svg" viewBox="0 0 109 109" aria-label="' + c + '"></svg>' +
      '<button class="dd-play" id="dd-play">▶ Xem thứ tự nét</button></div>' +
      '<div class="dd-info"><div class="dd-hv">' + esc(d.hv.startsWith('(') ? '' : d.hv) + '</div>' +
      '<div class="dd-vi">' + esc(d.vi) + '</div><div class="dd-en">' + esc(d.en || '') + '</div>' +
      '<div class="dd-chips"><span>' + strokes + ' nét</span>' + (radName ? '<span>Bộ ' + esc(radName) + '</span>' : '') +
      '<span>' + GRADE_NAME[grade] + '</span><span>Kanken ' + KANKEN_NAME[kk] + '</span>' +
      (learned ? '<span class="ok">✅ Đã học' + (card ? ' · ' + Sumi.STAGES[card.s].icon + ' ' + Sumi.STAGES[card.s].name : '') + '</span>' : '') + '</div>' +
      '<div class="dd-actions"><a class="dd-btn primary" href="level.html?id=' + grade + '&k=' + encodeURIComponent(c) + '">📖 ' + (learned ? 'Xem cách học' : 'Học chữ này') + '</a>' +
      '<button class="dd-btn" id="dd-speak">🔊 Nghe</button></div></div></div>';

    // Cách đọc
    const kun = (d.kun || []).map((r) => sumiKun(r));
    h += '<section class="dd-sec"><h3>よみ <small>Cách đọc</small></h3><div class="dd-reads">' +
      '<div><span class="lab on">音読み On</span>' + (d.on.length ? d.on.map((r) => '<span class="rd on">' + esc(r) + '</span>').join('') : '<i>—</i>') + '</div>' +
      '<div><span class="lab kun">訓読み Kun</span>' + (kun.length ? kun.map((r) => '<span class="rd kun">' + esc(r) + '</span>').join('') : '<i>—</i>') + '</div></div></section>';

    // Nguồn gốc
    if (d.o) {
      const [t, parts, vi, en] = d.o;
      const ty = ORIGIN[t] || ORIGIN.V;
      h += '<section class="dd-sec dd-origin"><h3>なりたち <small>Nguồn gốc chữ</small> <span class="ot ot-' + t + '">' + ty[0] + ' ' + ty[1] + '</span></h3>' +
        (parts.length ? '<div class="dd-formula">' + parts.map((p, i) => '<span style="color:' + PART_COLORS[i % 6] + '">' + p[0] + '</span>').join('<i>+</i>') + '<i>→</i>' + c + '</div>' +
          '<div class="dd-parts">' + parts.map((p, i) => '<span class="op" style="--pc:' + PART_COLORS[i % 6] + '"><b>' + p[0] + '</b>' + esc(p[1]) + '<em class="role-' + p[2] + '">' + ROLE[p[2]] + '</em></span>').join('') + '</div>' : '') +
        '<p>' + esc(vi) + '</p><p class="en">' + esc(en) + '</p></section>';
    }

    // Từ vựng
    if (d.w && d.w.length) {
      h += '<section class="dd-sec"><h3>ことば <small>Từ vựng</small></h3><ul class="dd-words">' + d.w.map((w) =>
        '<li><span class="w">' + Array.from(w[0]).map((ch) => ch === c ? '<mark>' + ch + '</mark>' : esc(ch)).join('') + '</span>' +
        '<span class="r">' + esc(w[1]) + (w[2] && w[0].length > 1 ? ' <small>' + esc(w[2]) + '</small>' : '') + '</span>' +
        '<span class="g">' + esc(w[3]) + (w[4] ? '<i>' + esc(w[4]) + '</i>' : '') + '</span></li>').join('') + '</ul></section>';
    }
    // Câu ví dụ
    if (d.sn && d.sn.length) {
      h += '<section class="dd-sec"><h3>れいぶん <small>Câu ví dụ</small></h3><ul class="dd-sents">' + d.sn.map((s) =>
        '<li><p class="jp">' + sumiRubyHtml(s[0], c) + '</p><p>' + esc(s[1]) + '</p>' + (s[2] ? '<p class="en">' + esc(s[2]) + '</p>' : '') + '</li>').join('') + '</ul></section>';
    }
    // Chữ liên quan
    const sameRad = ALL.filter((x) => x !== c && DICT[x][3] === radN).sort((a, b) => DICT[a][2] - DICT[b][2]).slice(0, 30);
    const partChars = d.o ? (d.o[1] || []).map((p) => p[0]).filter((p) => p !== c) : [];
    let samePart = [];
    if (partChars.length) {
      const phon = (d.o[1] || []).filter((p) => p[2] !== 'n').map((p) => p[0]);
      const want = phon.length ? phon : partChars;
      samePart = ALL.filter((x) => x !== c && want.some((p) => x === p)).concat(
        ALL.filter((x) => x !== c && (SI[x] && want.some((p) => partIndex[x] && partIndex[x].includes(p))))).filter((x, i, a) => a.indexOf(x) === i).slice(0, 30);
    }
    if (samePart.length) {
      h += '<section class="dd-sec"><h3>なかま <small>Chữ có cùng thành phần ' + esc((d.o[1] || []).filter((p) => p[2] !== 'n').map((p) => p[0]).join('、') || partChars.join('、')) + '</small></h3><div class="dd-rel">' + relatedTiles(samePart) + '</div></section>';
    }
    if (sameRad.length) {
      h += '<section class="dd-sec"><h3>部首 <small>Chữ cùng bộ ' + esc(rad[0] || '') + ' (' + sameRad.length + (sameRad.length === 30 ? '+' : '') + ')</small></h3><div class="dd-rel">' + relatedTiles(sameRad) + '</div></section>';
    }
    $('dd-body').innerHTML = h;
    $('dd-body').scrollTop = 0;
    drawStrokes(d.p || [], false);
    $('dd-play').onclick = () => drawStrokes(d.p || [], true);
    $('dd-speak').onclick = () => speak(d);
    if (!('speechSynthesis' in window)) $('dd-speak').hidden = true;
  }

  // Thành phần của mỗi chữ (từ dữ liệu nguồn gốc) – nạp dần khi mở chi tiết
  const partIndex = {};
  function indexParts(k, data) {
    for (const c of Object.keys(data)) partIndex[c] = data[c].o ? (data[c].o[1] || []).map((p) => p[0]) : [];
  }
  // Nạp nền toàn bộ dữ liệu thành phần để "chữ cùng thành phần" đầy đủ
  function preloadParts() {
    KANKEN_ORDER.reduce((p, k) => p.then(() => loadKanken(k).then((d) => indexParts(k, d))), Promise.resolve()).catch(() => {});
  }

  function drawStrokes(paths, animate) {
    clearInterval(anim);
    const svg = $('dd-svg');
    if (!svg) return;
    svg.innerHTML = paths.map((p) => '<path class="ghost" d="' + p[0] + '"/>').join('') +
      paths.map((p, i) => '<path class="ink' + (animate ? ' hide' : '') + '" d="' + p[0] + '"/>' +
        (p[1] != null ? '<text x="' + p[1] + '" y="' + p[2] + '">' + (i + 1) + '</text>' : '')).join('');
    if (!animate) return;
    const inks = svg.querySelectorAll('.ink');
    let i = 0;
    const step = () => {
      if (i >= inks.length) { clearInterval(anim); return; }
      const el = inks[i];
      const len = el.getTotalLength();
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
      el.classList.remove('hide');
      el.getBoundingClientRect();
      el.style.transition = 'stroke-dashoffset .5s ease';
      el.style.strokeDashoffset = 0;
      i++;
    };
    step();
    anim = setInterval(step, 600);
  }

  function speak(d) {
    if (!('speechSynthesis' in window)) return;
    const text = (d.w && d.w[0]) ? d.w[0][1] : (d.kun[0] || d.on[0] || '').replace(/[.-]/g, '');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('ja'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- Sự kiện ----------
  let timer = null;
  $('q').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = $('q').value; state.limit = 240; run(); }, 120);
  });
  $('q-clear').onclick = () => { $('q').value = ''; state.q = ''; run(); $('q').focus(); };
  $('f-level').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.level = b.dataset.v; state.limit = 240;
    $('f-level').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    run();
  });
  $('f-strokes').onchange = (e) => { state.strokes = e.target.value; run(); };
  $('f-radical').onchange = (e) => { state.radical = e.target.value; run(); };
  $('f-sort').onchange = (e) => { state.sort = e.target.value; run(); };
  $('f-learned').onchange = (e) => { state.learned = e.target.checked; run(); };
  $('more-btn').onclick = () => { state.limit += 480; render(); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.dt, .rel');
    if (t) openDetail(t.dataset.k);
  });
  $('dd-close').onclick = closeDetail;
  $('dd').addEventListener('click', (e) => { if (e.target === $('dd')) closeDetail(); });
  $('dd-prev').onclick = () => go(-1);
  $('dd-next').onclick = () => go(1);
  document.addEventListener('keydown', (e) => {
    if ($('dd').hidden) {
      if (e.key === '/' && document.activeElement !== $('q')) { e.preventDefault(); $('q').focus(); }
      return;
    }
    if (e.key === 'Escape') closeDetail();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });
  window.addEventListener('pageshow', () => { learnedMap = loadLearned(); });

  // ---------- Khởi động ----------
  const params = new URLSearchParams(location.search);
  if (params.get('q')) { $('q').value = params.get('q'); state.q = params.get('q'); }
  run();
  const hashK = decodeURIComponent(location.hash.slice(1));
  if (hashK && DICT[hashK]) openDetail(hashK, false);
  preloadParts();
})();
