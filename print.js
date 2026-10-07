// ===== Trang in: PDF luyện viết (漢字練習帳) và Sổ tay ôn tập =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = sumiEsc;
  const params = new URLSearchParams(location.search);
  const levelId = LEVELS[params.get('level')] ? params.get('level') : null;
  if (!levelId) { location.href = 'index.html'; return; }
  if (window.SumiPath && !SumiPath.unlocked(levelId)) { location.href = 'level.html?id=' + levelId; return; }
  const level = LEVELS[levelId];
  const levelName = level.title.split(' (')[0];
  const PREF_KEY = 'sumiKanji.printPrefs';
  let prefs = { type: 'write', scope: 'all', trace: '3', rows: '1', sent: true, en: true, origin: true };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch (e) { /* bỏ qua */ }
  if (params.get('type') === 'write' || params.get('type') === 'note') prefs.type = params.get('type');
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* bỏ qua */ } };

  const ORIGIN = { T: '象形 Tượng hình', C: '指事 Chỉ sự', H: '会意 Hội ý', F: '形声 Hình thanh', K: '国字 Chữ Nhật tạo', V: 'Khác' };
  const SCOPE_NAME = { all: 'Tất cả chữ', todo: 'Chữ chưa học', learned: 'Chữ đã học', fav: 'Chữ yêu thích' };
  if (!SCOPE_NAME[prefs.scope]) prefs.scope = 'all';
  let data = {};
  let symId = {};

  // ---------- Ký hiệu SVG cho mỗi chữ (dùng lại nhiều lần) ----------
  function buildSymbols(chars) {
    symId = {};
    $('sym').innerHTML = chars.map((c, i) => {
      symId[c] = 's' + i;
      return '<symbol id="s' + i + '" viewBox="0 0 109 109">' + (data[c].p || []).map((p) => '<path d="' + p[0] + '"/>').join('') + '</symbol>';
    }).join('');
  }
  const useK = (c, cls) => '<svg class="' + cls + '" viewBox="0 0 109 109"><use href="#' + symId[c] + '"/></svg>';

  // Chữ mẫu có số thứ tự nét
  function modelSvg(c) {
    const p = data[c].p || [];
    return '<svg class="k-model" viewBox="0 0 109 109"><use href="#' + symId[c] + '"/>' +
      p.map((s, i) => (s[1] != null ? '<text x="' + s[1] + '" y="' + s[2] + '">' + (i + 1) + '</text>' : '')).join('') + '</svg>';
  }

  // Dải thứ tự nét: khung i hiện nét 1..i, nét i tô đỏ
  function orderStrip(c) {
    const p = data[c].p || [];
    return p.map((_, i) => '<svg class="k-step" viewBox="0 0 109 109">' +
      p.slice(0, i + 1).map((s, j) => '<path d="' + s[0] + '"' + (j === i ? ' class="cur"' : '') + '/>').join('') + '</svg>').join('');
  }

  function readings(d) {
    const on = (d.on || []).slice(0, 4).join('・');
    const kun = Array.from(new Set((d.kun || []).map(sumiKun))).slice(0, 4).join('・');
    return { on, kun };
  }

  function sheetHead(title, n) {
    return '<div class="sheet-head"><div class="sh-brand">Sumi Kanji</div><div class="sh-title">' + title + '</div>' +
      '<div class="sh-sub">' + esc(levelName) + ' · ' + esc(level.badge) + ' · ' + n + ' chữ (' + SCOPE_NAME[prefs.scope] + ')</div>' +
      '<div class="sh-name">Họ tên: <span></span> Ngày: <span class="short"></span></div></div>';
  }

  // ---------- PDF luyện viết ----------
  function renderWrite(chars) {
    const trace = Number(prefs.trace);
    const rows = Number(prefs.rows);
    const html = chars.map((c) => {
      const d = data[c];
      const r = readings(d);
      const w = (d.w || []).slice(0, 2).map((x) => '<span><b>' + esc(x[0]) + '</b> ' + esc(x[1]) + ' – ' + esc(x[3]) + '</span>').join('');
      let practice = '';
      for (let row = 0; row < rows; row++) {
        practice += '<div class="k-row">';
        for (let i = 0; i < 10; i++) {
          const t = row === 0 ? i < trace : false;
          practice += '<div class="cell">' + (t ? useK(c, 'k-trace') : '') + '</div>';
        }
        practice += '</div>';
      }
      return '<section class="k-block">' +
        '<div class="k-top">' +
          '<div class="k-model-box">' + modelSvg(c) + '</div>' +
          '<div class="k-info">' +
            '<div class="k-name"><b>' + esc(d.hv.startsWith('(') ? '' : d.hv) + '</b> ' + esc(d.vi) + '</div>' +
            '<div class="k-read">' + (r.on ? '<span class="on">音 ' + esc(r.on) + '</span>' : '') + (r.kun ? '<span class="kun">訓 ' + esc(r.kun) + '</span>' : '') + '</div>' +
            '<div class="k-meta">' + d.s + ' nét' + (d.r ? ' · Bộ ' + esc(d.r[0]) + ' ' + esc(d.r[1]) : '') + '</div>' +
            '<div class="k-words">' + w + '</div>' +
          '</div>' +
          '<div class="k-order">' + orderStrip(c) + '</div>' +
        '</div>' + practice + '</section>';
    }).join('');
    return sheetHead('漢字練習帳 – Luyện viết', chars.length) +
      '<p class="sheet-guide">Cách luyện của học sinh Nhật: xem thứ tự nét (nét đỏ là nét đang viết) → tô theo các ô chữ mờ → tự viết các ô trống, chú ý とめ・はね・はらい.</p>' + html;
  }

  // ---------- Sổ tay ôn tập ----------
  function renderNote(chars) {
    const html = chars.map((c, idx) => {
      const d = data[c];
      const r = readings(d);
      let h = '<section class="n-card">' +
        '<div class="n-top">' + useK(c, 'n-kanji') +
          '<div class="n-main"><div class="n-no">' + (idx + 1) + '</div>' +
          '<div class="n-hv">' + esc(d.hv.startsWith('(') ? '' : d.hv) + '</div><div class="n-vi">' + esc(d.vi) + '</div>' +
          (prefs.en && d.en ? '<div class="n-en">' + esc(d.en) + '</div>' : '') + '</div>' +
          '<div class="n-check">□ Nhớ<br>□ Viết được</div>' +
        '</div>' +
        '<div class="n-read">' + (r.on ? '<span class="on">音 ' + esc(r.on) + '</span>' : '') + (r.kun ? '<span class="kun">訓 ' + esc(r.kun) + '</span>' : '') +
          '<span class="n-meta">' + d.s + ' nét' + (d.r ? ' · Bộ ' + esc(d.r[0]) : '') + '</span></div>';
      if (prefs.origin && d.o) {
        const parts = d.o[1] || [];
        h += '<div class="n-origin"><b>' + ORIGIN[d.o[0]] + '</b>' + (parts.length ? ' ' + esc(parts.map((p) => p[0]).join(' + ')) + ' → ' + c : '') +
          '<span>' + esc(d.o[2]) + '</span></div>';
      }
      if (d.w && d.w.length) {
        h += '<ul class="n-words">' + d.w.slice(0, 3).map((w) => '<li><b>' + esc(w[0]) + '</b><span class="rd">' + esc(w[1]) + '</span>' + esc(w[3]) +
          (prefs.en && w[4] ? ' <i>· ' + esc(w[4]) + '</i>' : '') + '</li>').join('') + '</ul>';
      }
      if (prefs.sent && d.sn && d.sn.length) {
        const s = d.sn[0];
        h += '<div class="n-sent"><p class="jp">' + sumiRubyHtml(s[0], c) + '</p><p>' + esc(s[1]) + (prefs.en && s[2] ? ' <i>· ' + esc(s[2]) + '</i>' : '') + '</p></div>';
      }
      return h + '</section>';
    }).join('');
    return sheetHead('復習ノート – Sổ tay ôn tập', chars.length) + '<div class="n-grid">' + html + '</div>';
  }

  // ---------- Hiển thị ----------
  function render() {
    document.querySelectorAll('#opt-type button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.type));
    document.body.classList.toggle('mode-write', prefs.type === 'write');
    document.body.classList.toggle('mode-note', prefs.type === 'note');
    $('opt-scope').value = prefs.scope;
    $('opt-trace').value = prefs.trace;
    $('opt-rows').value = prefs.rows;
    $('opt-sent').checked = prefs.sent;
    $('opt-en').checked = prefs.en;
    $('opt-origin').checked = prefs.origin;

    renderPick();
    const chars = sumiScopeChars(levelId, prefs.scope).filter((c) => data[c]);
    const name = prefs.type === 'write' ? 'Luyen-viet' : 'So-tay';
    document.title = 'Sumi-Kanji_' + name + '_' + levelName.replace(/\s+/g, '-');
    if (!chars.length) {
      $('paper').innerHTML = '<div class="empty">' + (prefs.scope === 'fav' ? 'Chưa chọn chữ nào. Bấm vào các chữ ở khung phía trên để cho vào sổ tay.' : 'Không có chữ nào trong phạm vi “' + SCOPE_NAME[prefs.scope] + '”. Hãy chọn phạm vi khác.') + '</div>';
      $('tb-count').textContent = '';
      $('print-btn').disabled = true;
      return;
    }
    $('print-btn').disabled = false;
    buildSymbols(chars);
    $('paper').innerHTML = prefs.type === 'write' ? renderWrite(chars) : renderNote(chars);
    const perPage = prefs.type === 'write' ? (prefs.rows === '1' ? 5 : prefs.rows === '2' ? 4 : 3) : 6;
    $('tb-count').textContent = chars.length + ' chữ · khoảng ' + Math.max(1, Math.ceil(chars.length / perPage)) + ' trang A4';
  }

  // ---------- Tự chọn chữ yêu thích ----------
  function scopeLabels() {
    $('opt-scope').querySelectorAll('option').forEach((o) => {
      o.dataset.base = o.dataset.base || o.textContent;
      o.textContent = o.dataset.base + ' (' + sumiScopeChars(levelId, o.value).length + ')';
    });
  }
  function renderPick() {
    const on = prefs.scope === 'fav';
    $('pick').hidden = !on;
    scopeLabels();
    if (!on) return;
    const all = levelChars(levelId).filter((c) => data[c]);
    const learned = loadLearned();
    const n = all.filter((c) => SumiFav.has(c)).length;
    $('pick-count').textContent = 'Đã chọn ' + n + '/' + all.length + ' chữ';
    $('pick-grid').innerHTML = all.map((c) => '<button class="pk' + (SumiFav.has(c) ? ' on' : '') + (learned[c] ? ' lr' : '') + '" data-c="' + c + '" title="' + esc(data[c].hv) + ' – ' + esc(data[c].vi) + '"><b>' + c + '</b><small>' + esc((data[c].hv || '').split(/[\s/]/)[0]) + '</small></button>').join('');
  }
  $('pick-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.pk'); if (!b) return;
    SumiFav.toggle(b.dataset.c); render();
  });
  document.querySelector('.pick-acts').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const all = levelChars(levelId).filter((c) => data[c]);
    if (b.dataset.a === 'all') SumiFav.setMany(all, true);
    else if (b.dataset.a === 'none') SumiFav.setMany(all, false);
    else { const l = loadLearned(); SumiFav.setMany(all, false); SumiFav.setMany(all.filter((c) => l[c]), true); }
    render();
  });

  // ---------- Thao tác ----------
  $('opt-type').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    prefs.type = b.dataset.v; savePrefs(); render();
    history.replaceState(null, '', '?level=' + levelId + '&type=' + prefs.type);
  });
  ['scope', 'trace', 'rows'].forEach((k) => $('opt-' + k).addEventListener('change', (e) => { prefs[k] = e.target.value; savePrefs(); render(); }));
  ['sent', 'en', 'origin'].forEach((k) => $('opt-' + k).addEventListener('change', (e) => { prefs[k] = e.target.checked; savePrefs(); render(); }));
  $('print-btn').addEventListener('click', () => window.print());

  // ---------- Khởi động ----------
  $('back-btn').href = 'level.html?id=' + levelId;
  $('back-btn').textContent = '← ' + levelName;
  $('paper').innerHTML = '<div class="empty">Đang tải…</div>';
  sumiLoadLevel(levelId).then((d) => { data = d; render(); })
    .catch((err) => { $('paper').innerHTML = '<div class="empty">' + esc(err.message) + '</div>'; });
})();
