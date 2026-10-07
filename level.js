// ===== Trang danh sách chữ + cửa sổ học 5 bước =====
(function () {
  const params = new URLSearchParams(location.search);
  const levelId = LEVELS[params.get('id')] ? params.get('id') : 'g1';
  const level = LEVELS[levelId];
  const openChar = params.get('k');

  const $ = (id) => document.getElementById(id);
  let chars = [];          // toàn bộ chữ của cấp này
  let learned = loadLearned();
  let listMode = 'todo';   // 'todo' | 'done'
  let current = null;      // chữ đang mở
  let data = {};           // dữ liệu chi tiết từng chữ
  // Chữ đã luyện viết đủ 5 lần (bắt buộc trước khi kiểm tra chữ)
  const WKEY = 'sumiKanji.written';
  const written = (() => { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } })();
  function markWritten(c) { written[c] = 1; try { localStorage.setItem(WKEY, JSON.stringify(written)); } catch (e) {} }

  // ---------- Nạp dữ liệu của cấp ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Không tải được ' + src));
      document.head.appendChild(s);
    });
  }

  document.title = level.title + ' – Sumi Kanji';
  $('quiz-btn').href = 'review.html?mode=practice&level=' + levelId;
  $('flash-btn').href = 'flash.html?level=' + levelId;
  ['treasure', 'hunt', 'catch', 'memo', 'twins'].forEach((g) => { const el = $('g-' + g); if (el) el.href = g + '.html?level=' + levelId; });
  $('write-btn').href = 'print.html?level=' + levelId + '&type=write';
  $('note-btn').href = 'print.html?level=' + levelId + '&type=note';

  function renderTop() {
    const st = Sumi.load();
    if (window.SumiPath) {
      const rk = SumiPath.rank();
      $('pill-lv').innerHTML = HIYO.svg(rk.form, rk.form === 0 ? 'sleep' : 'happy', { cls: 'pill-hiyo' }) + '<b>Lv ' + rk.label + '</b>';
      $('pill-lv').title = rk.name;
    }
    const due = Sumi.dueList().length;
    $('pill-due').textContent = due;
    $('pill-review').classList.toggle('has-due', due > 0);
    $('pill-xp').textContent = '⭐ ' + Sumi.todayXP() + '/' + st.goal;
    const sk = Sumi.streakInfo();
    $('pill-streak').textContent = '🔥 ' + sk.count;
    $('pill-streak').classList.toggle('done', sk.todayDone);
  }
  renderTop();
  $('level-badge').textContent = level.badge;
  $('level-title').textContent = level.title;
  $('level-desc').textContent = level.desc;

  Promise.all(level.src.map((k) => loadScript('data/kanji-' + k + '.js')))
    .then(() => {
      level.src.forEach((k) => Object.assign(data, window.SUMI_DATA[k]));
      chars = levelChars(levelId);
      $('level-total').textContent = 'Tổng số: ' + chars.length + ' chữ';
      if (!P.unlocked(levelId)) { renderLock(); if (openChar && data[openChar]) { order = [openChar]; openStudy(openChar); } return; }
      render();
      if (openChar && data[openChar]) openStudy(openChar);
    })
    .catch((err) => {
      $('level-title').textContent = 'Không tải được dữ liệu';
      $('level-desc').textContent = err.message + '. Hãy kiểm tra thư mục data/ nằm cạnh level.html.';
    });

  // ---------- Danh sách ----------
  const P = window.SumiPath;
  const isOpen = (c) => P.charOpen(levelId, c);
  function todoList() { return chars.filter((c) => !learned[c] && isOpen(c)); }
  function lockedList() { return chars.filter((c) => !learned[c] && !isOpen(c)); }
  function doneList() { return chars.filter((c) => learned[c]).sort((a, b) => learned[b] - learned[a]); }
  function visibleList() { return listMode === 'todo' ? todoList() : doneList(); }

  function render() {
    learned = loadLearned();
    renderTop();
    renderPath();
    const todo = todoList();
    const done = chars.filter((c) => learned[c]).length;
    const pct = chars.length ? (done / chars.length) * 100 : 0;

    $('progress-count').textContent = done + ' / ' + chars.length + ' chữ (' + Math.round(pct) + '%)';
    $('progress-fill').style.width = pct.toFixed(1) + '%';
    $('progress-note').textContent = done === 0
      ? 'Nhấn vào một chữ để bắt đầu học. Học xong làm "Kiểm tra chữ này" (3 câu) để chuyển chữ sang danh sách đã học.'
      : done === chars.length
        ? '🎉 Tuyệt vời! Bạn đã học hết ' + chars.length + ' chữ của cấp này.'
        : 'Còn ' + (chars.length - done) + ' chữ nữa là học hết cấp này. Cố lên!';
    $('count-todo').textContent = todo.length;
    $('count-done').textContent = done;
    $('reset-all').hidden = !(listMode === 'done' && done > 0);

    const list = visibleList();
    const grid = $('kanji-grid');
    grid.innerHTML = list.map((c) => {
      const hv = (data[c] && data[c].hv) || '';
      const card = Sumi.card(c);
      const stg = card ? Sumi.STAGES[card.s] : null;
      return `<div class="kanji-tile${learned[c] ? ' done stage-' + stg.g : ''}" data-k="${c}" role="button" tabindex="0" aria-label="${c} ${hv}"${stg ? ` title="${stg.name}"` : ''}>
        ${stg ? `<span class="tile-stage">${stg.icon}</span>` : ''}
        <span class="tile-char">${c}</span>
        <span class="tile-hv">${hv.startsWith('(') ? '' : hv}</span>
        ${learned[c] ? `<button class="tile-relearn" data-relearn="${c}">↺ Học lại</button>` : ''}
      </div>`;
    }).join('');

    // Chữ ở các màn đang khóa
    const locked = lockedList();
    if (listMode === 'todo' && locked.length) {
      const nextLocked = P.stageInfo(levelId).find((x) => x.status === 'locked');
      const why = nextLocked && nextLocked.needMid ? 'Qua kiểm tra giữa cấp để mở màn ' + nextLocked.no
        : 'Qua màn ' + (nextLocked ? nextLocked.no - 1 : '') + ' để mở màn ' + (nextLocked ? nextLocked.no : '');
      grid.innerHTML += '<div class="locked-block"><div class="lb-icon">🔒</div><div><b>Còn ' + locked.length + ' chữ ở các màn sau</b>' +
        '<small>' + why + '</small></div>' +
        '<div class="lb-peek">' + locked.slice(0, 10).map((c) => '<span>' + c + '</span>').join('') + (locked.length > 10 ? '<span>…</span>' : '') + '</div></div>';
    }

    const empty = $('empty-state');
    if (!list.length && !(listMode === 'todo' && locked.length)) {
      empty.hidden = false;
      empty.innerHTML = listMode === 'todo'
        ? '<div class="big">🎉</div><h3>Đã học hết rồi!</h3><p>Xem lại ở tab "Đã học" hoặc chuyển sang cấp tiếp theo.</p>'
        : '<div class="big">📖</div><h3>Chưa có chữ nào</h3><p>Các chữ bạn đã qua "Kiểm tra chữ" sẽ xuất hiện ở đây.</p>';
    } else {
      empty.hidden = true;
    }
  }

  // ---------- Lộ trình màn chơi ----------
  // Màn 1…n, giữa đường có 📝 Kiểm tra giữa cấp, cuối cùng là 🏯 Thi tổng hợp
  function renderPath() {
    const info = P.stageInfo(levelId);
    const cleared = P.cleared(levelId);
    const allDone = info.every((x) => x.status === 'done');
    const cur = info.find((x) => x.status !== 'done');
    const best = P.gateBest(levelId);
    const h = P.half(levelId), ms = P.midState(levelId);
    const T = (q) => 'test.html?level=' + levelId + q;
    const node = (cls, href, icon, label, title) => '<a class="pn ' + cls + '"' + (href ? ' href="' + href + '"' : '') + ' title="' + title + '"><span class="pn-dot">' + icon + '</span><span class="pn-no">' + label + '</span></a>';
    let nodes = [];
    info.forEach((x, i) => {
      if (h && i === h) {
        const st = ms === 'done' ? 'done' : ms === 'ready' ? 'quiz' : 'locked';
        nodes.push(node('mid st-' + st + (ms === 'ready' ? ' cur' : ''), ms !== 'locked' ? T('&n=mid') : '', ms === 'done' ? '✅' : '📝', 'Giữa', 'Kiểm tra giữa cấp · 50 câu'));
      }
      const icon = x.status === 'done' ? '⭐' : x.status === 'quiz' ? '⚔️' : x.status === 'open' ? '▶' : '🔒';
      const href = x.status === 'quiz' ? T('&stage=' + x.no) : x.status === 'done' ? 'story.html?level=' + levelId + '&stage=' + x.no : '';
      nodes.push(node('st-' + x.status + (cur && cur.i === x.i && !cur.needMid ? ' cur' : ''), href, icon, x.no, x.status === 'done' ? 'Màn ' + x.no + ': đã qua · bấm để chơi lại Truyện ghi nhớ' : 'Màn ' + x.no + ': ' + x.learned + '/' + x.total + ' chữ'));
    });
    nodes.push(node('boss st-' + (cleared ? 'done' : allDone ? 'quiz' : 'locked') + (allDone && !cleared ? ' cur' : ''), allDone || cleared ? T('&n=all') : '', cleared ? '🏆' : '🏯', 'Tổng hợp', 'Thi tổng hợp toàn bộ chữ'));
    let cta;
    const nx = P.nextOf(levelId);
    if (cleared) {
      cta = '<div class="pc-msg ok"><b>🏆 Đã hoàn thành cấp này!</b><span>' + (nx ? 'Cấp tiếp theo <b>' + esc(P.short(nx)) + '</b> đã mở khóa.' : 'Bạn đã đi hết lộ trình. Tuyệt vời!') + '</span></div>' +
        (nx ? '<a class="pc-btn" href="level.html?id=' + nx + '">Sang ' + esc(P.short(nx)) + ' →</a>' : '');
    } else if (allDone) {
      cta = '<div class="pc-msg boss"><b>🏯 Trận cuối: Thi tổng hợp</b><span>Kiểm tra toàn bộ ' + chars.length + ' chữ, đạt từ <b>' + P.PASS + ' điểm</b> để lên ' + (nx ? esc(P.short(nx)) : 'cấp tiếp theo') + ' và Hiyo tiến hóa.' + (best ? ' Điểm cao nhất: ' + best + '.' : '') + ' Có thể dừng giữa chừng, lần sau làm tiếp.</span></div>' +
        '<a class="pc-btn boss" href="' + T('&n=all') + '">🏯 Vào thi</a>';
    } else if (cur.needMid) {
      cta = '<div class="pc-msg quiz"><b>📝 Xong nửa chặng đường!</b><span>Làm <b>Kiểm tra giữa cấp</b> (50 câu về ' + P.midChars(levelId).length + ' chữ đã học), đạt từ ' + P.PASS + ' điểm để mở màn ' + cur.no + '.</span></div>' +
        '<a class="pc-btn quiz" href="' + T('&n=mid') + '">📝 Kiểm tra giữa cấp</a>';
    } else if (cur.status === 'quiz') {
      cta = '<div class="pc-msg quiz"><b>⚔️ Màn ' + cur.no + ': đã học xong ' + cur.total + ' chữ!</b><span>Làm kiểm tra màn (' + cur.total + ' câu), đúng từ ' + Math.ceil(cur.total * P.PASS / 100) + ' câu để qua màn.</span></div>' +
        '<a class="pc-btn quiz" href="' + T('&stage=' + cur.no) + '">⚔️ Kiểm tra màn ' + cur.no + '</a>';
    } else {
      cta = '<div class="pc-msg"><b>▶ Màn ' + cur.no + ' / ' + info.length + '</b><span>Đã học ' + cur.learned + '/' + cur.total + ' chữ. Mở từng chữ, học xong bấm <b>Kiểm tra chữ này</b> (3 câu) để hoàn thành chữ.</span></div>' +
        '<div class="pc-mini"><i style="width:' + (cur.learned / cur.total * 100) + '%"></i></div>';
    }
    $('path-card').innerHTML = '<div class="pc-head"><span class="pc-title">🗺 Lộ trình <small>' + info.filter((x) => x.status === 'done').length + '/' + info.length + ' màn</small></span>' +
      (!cleared ? '<a class="pc-skip" href="' + T('&n=all') + '" title="Thi tổng hợp đạt từ ' + P.SKIP + ' điểm để vượt cấp">🚀 Đã biết hết? Thi vượt cấp</a>' : '') + '</div>' +
      '<div class="pc-map">' + nodes.join('<i class="pn-line"></i>') + '</div>' +
      '<div class="pc-legend"><span>⚔️ Kiểm tra màn: mỗi 10 chữ</span><span>📖 Màn đã qua: chơi lại Truyện ghi nhớ</span>' + (h ? '<span>📝 Giữa cấp: 50 câu</span>' : '') + '<span>🏯 Tổng hợp: toàn bộ chữ</span></div>' +
      '<div class="pc-cta">' + cta + '</div>';
    const curEl = $('path-card').querySelector('.pn.cur');
    if (curEl) curEl.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  // ---------- Cấp đang khóa ----------
  function renderLock() {
    const need = P.prereq(levelId).filter((x) => !P.cleared(x));
    const cur = P.current();
    const pre = need[0];
    const preInfo = pre ? P.stageInfo(pre) : [];
    const doneSt = preInfo.filter((x) => x.status === 'done').length;
    $('lock-screen').hidden = false;
    $('lock-screen').innerHTML = '<div class="ls-lock">🔒</div><h2>' + esc(level.title.split(' (')[0]) + ' đang khóa</h2>' +
      '<p>Sumi Kanji học theo lộ trình từ dễ đến khó giống trường Nhật. Hãy hoàn thành <b>' + esc(P.short(pre)) + '</b> (qua hết các màn và bài thi tổng hợp) để mở khóa cấp này.</p>' +
      (pre ? '<div class="ls-prog"><span>' + esc(P.short(pre)) + ': ' + doneSt + '/' + preInfo.length + ' màn</span><div><i style="width:' + (preInfo.length ? doneSt / preInfo.length * 100 : 0) + '%"></i></div></div>' : '') +
      '<div class="ls-btns"><a class="pc-btn" href="level.html?id=' + (LEVELS[pre] && LEVELS[pre].view === level.view ? pre : cur || 'g1') + '">▶ Học tiếp ' + esc(P.short(LEVELS[pre] && LEVELS[pre].view === level.view ? pre : cur || 'g1')) + '</a>' +
      '<a class="pc-ghost" href="index.html">← Trang chủ</a></div>' +
      '<p class="ls-note">💡 Nếu bạn đã biết chữ của cấp dưới, vào cấp đó và bấm <b>🚀 Thi vượt cấp</b>: đạt từ ' + P.SKIP + ' điểm là qua ngay.</p>';
    document.querySelectorAll('.progress-card, .path-card, .games-row, .list-tabs, #kanji-grid, #empty-state').forEach((el) => { el.hidden = true; el.style.display = 'none'; });
  }

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      listMode = btn.dataset.list;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  $('kanji-grid').addEventListener('click', (e) => {
    const re = e.target.closest('[data-relearn]');
    if (re) {
      e.stopPropagation();
      relearn(re.dataset.relearn, true);
      return;
    }
    const tile = e.target.closest('.kanji-tile');
    if (tile) openStudy(tile.dataset.k);
  });

  $('kanji-grid').addEventListener('keydown', (e) => {
    const tile = e.target.closest('.kanji-tile');
    if (tile && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openStudy(tile.dataset.k);
    }
  });

  $('reset-all').addEventListener('click', () => {
    const done = doneList();
    if (!done.length) return;
    if (!confirm('Đưa toàn bộ ' + done.length + ' chữ đã học của cấp này về danh sách "Chưa học"?')) return;
    Sumi.unlearn(done);
    render();
    toast('Đã đưa ' + done.length + ' chữ về danh sách chưa học');
  });

  // ---------- Đánh dấu đã học / học lại ----------
  function markDone(c) {
    const res = Sumi.learn(c);
    render();
    return res;
  }

  function relearn(c, fromGrid) {
    Sumi.unlearn(c);
    learned = loadLearned();
    if (fromGrid) {
      const tile = document.querySelector('.kanji-tile[data-k="' + c + '"]');
      if (tile) tile.classList.add('leaving');
      setTimeout(render, 220);
    } else {
      render();
    }
    toast('Đã đưa 「' + c + '」 về danh sách chưa học');
  }

  // ---------- Cửa sổ học ----------
  let order = [];  // thứ tự điều hướng trong cửa sổ

  function openStudy(c) {
    order = visibleList();
    if (!order.includes(c)) order = chars.slice();
    current = c;
    $('study').hidden = false;
    document.body.classList.add('no-scroll');
    fillStudy();
    history.replaceState(null, '', '?id=' + levelId + '&k=' + encodeURIComponent(c));
  }

  function closeStudy() {
    $('study').hidden = true;
    document.body.classList.remove('no-scroll');
    stopAnimation();
    current = null;
    history.replaceState(null, '', '?id=' + levelId);
  }

  function go(delta) {
    const i = order.indexOf(current);
    const n = order[i + delta];
    if (n) {
      current = n;
      fillStudy();
      history.replaceState(null, '', '?id=' + levelId + '&k=' + encodeURIComponent(n));
    }
  }

  function formatKun(r) {
    const clean = r.replace(/^-|-$/g, '');
    const [stem, okuri] = clean.split('.');
    return okuri ? stem + '<span class="okuri">' + okuri + '</span>' : stem;
  }

  function fillStudy() {
    const c = current;
    const d = data[c];
    const i = order.indexOf(c);
    const card = Sumi.card(c);
    let posText = (i + 1) + ' / ' + order.length;
    if (card) {
      const stg = Sumi.STAGES[card.s];
      const inDays = Sumi.diffDays(Sumi.today(), card.due);
      posText = stg.icon + ' ' + stg.name + ' · ' + (inDays <= 0 ? 'cần ôn hôm nay' : inDays === 1 ? 'ôn lại ngày mai' : 'ôn lại sau ' + inDays + ' ngày') + ' · ' + posText;
    }
    $('study-pos').textContent = posText;
    drawFav();
    $('study-prev').disabled = i <= 0;
    $('study-next').disabled = i >= order.length - 1;
    document.querySelector('.study-body').scrollTop = 0;

    // ① Quan sát
    $('study-kanji').textContent = c;
    $('study-hv').textContent = d.hv;
    $('study-meaning').textContent = d.vi;
    $('study-en').textContent = d.en ? 'EN: ' + d.en : '';
    const chips = ['<span class="chip">' + d.s + ' nét</span>'];
    if (d.r) {
      chips.push('<span class="chip">Bộ <b>' + d.r[0] + '</b> ' + d.r[1] + (d.r[2] ? ' (' + d.r[2] + ')' : '') + '</span>');
    }
    chips.push('<span class="chip">' + level.badge + '</span>');
    $('study-chips').innerHTML = chips.join('');
    $('study-look-tip').innerHTML = d.r
      ? 'Nhìn kỹ hình dạng chữ. Bộ thủ <b>' + d.r[0] + '</b> (' + d.r[1] + ') thường gợi ý nhóm nghĩa của chữ. Hãy thử liên tưởng một hình ảnh để nhớ nghĩa「' + d.vi + '」.'
      : 'Nhìn kỹ hình dạng chữ và liên tưởng một hình ảnh để nhớ nghĩa.';

    fillOrigin(c, d);
    if (window.SumiCommunity) SumiCommunity.mountKanji($('study-community'), c);

    // ② Cách đọc
    const on = d.on.slice(0, 4);
    const kun = Array.from(new Set(d.kun.map(formatKun))).slice(0, 5);
    $('study-on').innerHTML = on.length ? on.map((r) => '<span>' + r + '</span>').join('') : '<span class="none">Không có âm On</span>';
    $('study-kun').innerHTML = kun.length ? kun.map((r) => '<span>' + r + '</span>').join('') : '<span class="none">Không có âm Kun</span>';

    // ③ Thứ tự nét
    buildOrder(d.p);

    // ④ Tập viết
    buildGuide(d.p);
    resetDrill();

    // ⑤ Từ vựng & câu ví dụ
    const mark = (w) => Array.from(w).map((ch) => ch === c ? '<mark>' + ch + '</mark>' : ch).join('');
    const kanjiCount = (w) => (w.match(/[\u4e00-\u9fff\u3005]/g) || []).length;
    if (d.w && d.w.length) {
      $('study-examples').innerHTML = d.w.map(([w, r, hv, vi, en]) => `<li>
          <span class="ex-word">${mark(w)}</span>
          <span class="ex-read">${r}${hv && kanjiCount(w) > 1 ? '<span class="ex-hv">' + hv + '</span>' : ''}</span>
          <span class="ex-gloss">${escapeHtml(vi)}${en ? '<span class="en-line ex-en">' + escapeHtml(en) + '</span>' : ''}</span>
        </li>`).join('');
    } else {
      $('study-examples').innerHTML = (d.ex || []).length
        ? d.ex.map(([w, r, hv, en]) => `<li>
            <span class="ex-word">${mark(w)}</span>
            <span class="ex-read">${r}${hv && kanjiCount(w) > 1 ? '<span class="ex-hv">' + hv + '</span>' : ''}</span>
            <span class="ex-gloss">${en ? '<i>EN</i>' + en : ''}</span>
          </li>`).join('')
        : '<li><span class="ex-gloss">Chưa có từ ví dụ cho chữ này.</span></li>';
    }
    const sents = d.sn || [];
    $('study-sentences').innerHTML = sents.length
      ? sents.map(([segs, vi, en]) => `<li>
          <p class="sent-jp">${segs.map((sg) => typeof sg === 'string'
            ? escapeHtml(sg)
            : '<ruby>' + mark(sg[0]) + '<rt>' + sg[1] + '</rt></ruby>').join('')}</p>
          <p class="sent-vi">${escapeHtml(vi)}</p>
          ${en ? `<p class="sent-en en-line">${escapeHtml(en)}</p>` : ''}
        </li>`).join('')
      : '<li class="sent-empty">Chưa có câu ví dụ cho chữ này.</li>';

    // Nút cuối
    const open = P.unlocked(levelId) && isOpen(c);
    $('study-done').hidden = !!learned[c];
    $('study-done').disabled = !open;
    const stg = P.stageOf(levelId, c);
    $('study-done').dataset.open = open ? '1' : '';
    closeKQ();
    updateDoneBtn();
    $('study-relearn').hidden = !learned[c];
  }

  // ---------- なりたち: nguồn gốc chữ ----------
  const ORIGIN_TYPES = {
    T: ['象形', 'Tượng hình', 'Vẽ lại hình dạng sự vật'],
    C: ['指事', 'Chỉ sự', 'Dùng ký hiệu để chỉ ý niệm'],
    H: ['会意', 'Hội ý', 'Ghép nghĩa của các bộ phận'],
    F: ['形声', 'Hình thanh', 'Một phần chỉ nghĩa + một phần chỉ âm'],
    K: ['国字', 'Chữ Nhật tạo', 'Chữ do người Nhật tự sáng tạo'],
    V: ['仮借・その他', 'Giả tá / khác', 'Mượn âm, hoặc nguồn gốc chưa rõ']
  };
  const PART_COLORS = ['#e8590c', '#1c7ed6', '#2b8a3e', '#c2255c', '#7048e8', '#0c8599'];
  const ROLE = { n: 'gợi nghĩa', a: 'gợi âm', h: 'nghĩa + âm' };

  function fillOrigin(c, d) {
    const box = $('study-origin');
    if (!d.o) { box.hidden = true; $('study-look-tip').hidden = false; return; }
    box.hidden = false;
    $('study-look-tip').hidden = true;
    const [t, parts, vi, en] = d.o;
    const ty = ORIGIN_TYPES[t] || ORIGIN_TYPES.V;
    $('origin-type').className = 'origin-type ot-' + t;
    $('origin-type').innerHTML = '<b>' + ty[0] + '</b> ' + ty[1] + '<small>' + ty[2] + '</small>';

    // Tô màu từng bộ phận trên chữ
    const colorOf = {};
    parts.forEach((p, i) => (p[3] || []).forEach((n) => { colorOf[n] = PART_COLORS[i % PART_COLORS.length]; }));
    $('origin-svg').innerHTML = (d.p || []).map((p, i) =>
      '<path d="' + p[0] + '" stroke="' + (colorOf[i + 1] || (parts.length ? '#c9bfb2' : '#3a302a')) + '"/>').join('');

    if (parts.length) {
      $('origin-formula').innerHTML = parts.map((p, i) =>
        '<span class="of-part" style="color:' + PART_COLORS[i % PART_COLORS.length] + '">' + p[0] + '</span>').join('<i>+</i>') +
        '<i>→</i><span class="of-res">' + c + '</span>';
      $('origin-parts').innerHTML = parts.map((p, i) =>
        '<span class="op" style="--pc:' + PART_COLORS[i % PART_COLORS.length] + '"><b>' + p[0] + '</b>' + escapeHtml(p[1]) +
        '<em class="role-' + p[2] + '">' + ROLE[p[2]] + '</em></span>').join('');
    } else {
      $('origin-formula').innerHTML = '';
      $('origin-parts').innerHTML = '';
    }
    $('origin-vi').textContent = vi;
    $('origin-en').textContent = en;
  }

  // ---------- ③ Hoạt hình thứ tự nét ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  let strokeEls = [];
  let shown = 0;
  let animTimer = null;

  function buildOrder(paths) {
    stopAnimation();
    const svg = $('order-svg');
    svg.innerHTML = '';
    strokeEls = [];
    paths.forEach((p) => {
      const g = document.createElementNS(SVGNS, 'path');
      g.setAttribute('d', p[0]);
      g.setAttribute('class', 'ghost');
      svg.appendChild(g);
    });
    paths.forEach((p, i) => {
      const ink = document.createElementNS(SVGNS, 'path');
      ink.setAttribute('d', p[0]);
      ink.setAttribute('class', 'ink');
      svg.appendChild(ink);
      const len = ink.getTotalLength();
      ink.style.strokeDasharray = len;
      ink.style.strokeDashoffset = len;
      let num = null;
      if (p[1] !== undefined) {
        num = document.createElementNS(SVGNS, 'text');
        num.setAttribute('x', p[1]);
        num.setAttribute('y', p[2]);
        num.textContent = i + 1;
        num.style.opacity = 0;
        svg.appendChild(num);
      }
      strokeEls.push({ ink, len, num });
    });
    shown = 0;
    // Hiển thị sẵn toàn bộ chữ với số nét
    showAll();
  }

  function showAll() {
    strokeEls.forEach((s) => {
      s.ink.style.transition = 'none';
      s.ink.style.strokeDashoffset = 0;
      s.ink.classList.remove('current');
      if (s.num) s.num.style.opacity = 1;
    });
    shown = strokeEls.length;
  }

  function clearStrokes() {
    strokeEls.forEach((s) => {
      s.ink.style.transition = 'none';
      s.ink.style.strokeDashoffset = s.len;
      s.ink.classList.remove('current');
      if (s.num) s.num.style.opacity = 0;
    });
    shown = 0;
  }

  function drawStroke(i, duration) {
    const s = strokeEls[i];
    if (!s) return;
    strokeEls.forEach((x) => x.ink.classList.remove('current'));
    s.ink.classList.add('current');
    void s.ink.getBoundingClientRect();
    s.ink.style.transition = 'stroke-dashoffset ' + duration + 'ms ease-in-out';
    s.ink.style.strokeDashoffset = 0;
    if (s.num) s.num.style.opacity = 1;
  }

  function stopAnimation() {
    if (animTimer) clearTimeout(animTimer);
    animTimer = null;
  }

  function play() {
    stopAnimation();
    clearStrokes();
    let i = 0;
    const next = () => {
      if (i >= strokeEls.length) {
        strokeEls.forEach((x) => x.ink.classList.remove('current'));
        animTimer = null;
        return;
      }
      const dur = Math.min(900, Math.max(350, strokeEls[i].len * 9));
      drawStroke(i, dur);
      i++;
      shown = i;
      animTimer = setTimeout(next, dur + 180);
    };
    animTimer = setTimeout(next, 200);
  }

  $('order-play').addEventListener('click', play);
  $('order-step').addEventListener('click', () => {
    stopAnimation();
    if (shown >= strokeEls.length) clearStrokes();
    drawStroke(shown, 500);
    shown++;
  });
  $('order-reset').addEventListener('click', () => { stopAnimation(); clearStrokes(); });

  // ---------- ④ Tập viết (なぞりがき) ----------
  const canvas = $('practice-canvas');
  const ctx = canvas.getContext('2d');
  const TRACE = 3, FREE = 2;
  let round = 0;
  let drawing = false;
  let last = null;
  let hasInk = false;

  function buildGuide(paths) {
    $('practice-guide').innerHTML = paths.map((p) => '<path d="' + p[0] + '"/>').join('');
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk = false;
  }

  function resetDrill() {
    round = 0;
    clearCanvas();
    updateDrill();
  }

  function updateDrill() {
    const total = TRACE + FREE;
    let dots = '';
    for (let i = 0; i < total; i++) {
      const label = i < TRACE ? 'tô' : 'tự';
      dots += '<span class="' + (i < round ? 'filled' : i === round ? 'current' : '') + '">' + (i < round ? '✓' : label) + '</span>';
    }
    $('drill-dots').innerHTML = dots;
    const guide = $('practice-guide');
    if (round < TRACE) {
      guide.classList.remove('hide');
      $('drill-hint').textContent = 'Lần ' + (round + 1) + '/' + TRACE + ': tô theo nét mờ, đúng thứ tự nét.';
      $('practice-guide-toggle').textContent = 'Ẩn mẫu';
    } else if (round < total) {
      guide.classList.add('hide');
      $('drill-hint').textContent = 'Lần ' + (round - TRACE + 1) + '/' + FREE + ': tự viết không nhìn mẫu!';
      $('practice-guide-toggle').textContent = 'Hiện mẫu';
    } else {
      guide.classList.remove('hide');
      $('drill-hint').textContent = '🎉 Hoàn thành luyện viết! So sánh với mẫu rồi bấm "Kiểm tra chữ này".';
      $('practice-guide-toggle').textContent = 'Ẩn mẫu';
      if (current && !written[current]) markWritten(current);
    }
    updateDoneBtn();
  }

  // Nút cuối: chỉ mở kiểm tra khi đã luyện viết đủ (hoặc đã viết đủ ở lần học trước)
  function updateDoneBtn() {
    const btn = $('study-done');
    if (!current || btn.hidden) return;
    const c = current;
    if (!btn.dataset.open) {
      const stg = P.stageOf(levelId, c);
      btn.disabled = true;
      btn.classList.remove('need-write');
      btn.innerHTML = '🔒 Chữ này thuộc màn ' + (stg ? stg.no : '') + ' – chưa mở';
      return;
    }
    btn.disabled = false;
    const ok = written[c] || round >= TRACE + FREE;
    btn.classList.toggle('need-write', !ok);
    $('write-badge').className = 'must-badge' + (ok ? ' done' : '');
    $('write-badge').textContent = ok ? '✓ Đã viết đủ' : '✍️ Bắt buộc';
    btn.innerHTML = ok ? '📝 Kiểm tra chữ này <small>3 câu · +10⭐</small>'
      : '✍️ Luyện viết ' + Math.min(round, TRACE + FREE) + '/' + (TRACE + FREE) + ' <small>viết đủ để mở kiểm tra</small>';
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
  }

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    last = pos(e);
    canvas.setPointerCapture(e.pointerId);
    ctx.fillStyle = '#332d29';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 7, 0, Math.PI * 2);
    ctx.fill();
    hasInk = true;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.strokeStyle = '#332d29';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    last = p;
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    canvas.addEventListener(ev, () => { drawing = false; }));

  $('practice-clear').addEventListener('click', clearCanvas);
  $('practice-guide-toggle').addEventListener('click', () => {
    const g = $('practice-guide');
    g.classList.toggle('hide');
    $('practice-guide-toggle').textContent = g.classList.contains('hide') ? 'Hiện mẫu' : 'Ẩn mẫu';
  });
  $('practice-done').addEventListener('click', () => {
    if (!hasInk) { toast('Hãy viết chữ vào ô trước nhé ✍️'); return; }
    if (round < TRACE + FREE) round++;
    clearCanvas();
    updateDrill();
  });

  // ---------- Nút cuối cửa sổ ----------
  $('study-done').addEventListener('click', () => {
    if (!written[current] && round < TRACE + FREE) {
      const sec = $('practice-canvas').closest('.step');
      sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sec.classList.remove('pulse'); void sec.offsetWidth; sec.classList.add('pulse');
      toast('✍️ Hãy luyện viết đủ ' + (TRACE + FREE) + ' lần (tô 3 · tự viết 2) trước khi kiểm tra');
      return;
    }
    openKQ(current);
  });

  function finishChar(c) {
    const res = markDone(c);
    if (res) toast('✅ 「' + c + '」 đã vào danh sách ôn · +' + res.xp + '⭐ · hôm nay ' + res.total + '/' + res.goal);
    else toast('✅ Đã chuyển 「' + c + '」 sang danh sách đã học');
    const stg = P.stageOf(levelId, c);
    if (stg && stg.status === 'quiz') {
      closeStudy();
      sumiCelebrate({
        title: '⚔️ Học xong màn ' + stg.no + '!', mascot: 'cheer', button: 'Vào kiểm tra màn ' + stg.no,
        sub: 'Bạn đã học đủ ' + stg.total + ' chữ của màn ' + stg.no + '.<br>Làm bài kiểm tra màn (đúng từ ' + Math.ceil(stg.total * P.PASS / 100) + '/' + stg.total + ' câu) để mở màn tiếp theo.',
        onClose: () => { location.href = 'test.html?level=' + levelId + '&stage=' + stg.no; }
      });
      if (res) sumiGoalCelebrate(res);
      return;
    }
    const goOn = () => {
      const rest = todoList();
      if (!rest.length) {
        closeStudy();
        render();
        return;
      }
      const idx = chars.indexOf(c);
      const nextChar = rest.find((x) => chars.indexOf(x) > idx) || rest[0];
      order = todoList();
      current = nextChar;
      fillStudy();
      history.replaceState(null, '', '?id=' + levelId + '&k=' + encodeURIComponent(nextChar));
    };
    goOn();
    if (res) sumiGoalCelebrate(res);
  }

  // ---------- Kiểm tra từng chữ: 3 câu (nghĩa · cách đọc · cách viết), đúng từ 2/3 là qua ----------
  const kqShuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const KQ_PASS = 2;
  let KQ = null;
  window.__sumiKQ = () => KQ; // hỗ trợ kiểm thử tự động
  function uniq4(right, pool) {
    const out = [right];
    for (const x of kqShuffle(pool)) { if (out.length >= 4) break; if (x && !out.includes(x)) out.push(x); }
    return kqShuffle(out);
  }
  function kqQuestions(c) {
    const d = data[c];
    const others = Object.keys(data).filter((x) => x !== c);
    const qs = [];
    // ① Nghĩa
    const viOf = (x) => data[x].vi.split(/[;,]/)[0].trim();
    qs.push({ type: 'Nghĩa', ask: 'Chữ <b class="kq-big">' + c + '</b> có nghĩa là gì?', right: viOf(c), opts: uniq4(viOf(c), others.map(viOf)), cls: 'txt' });
    // ② Cách đọc trong một từ
    const words = (d.w || []).filter((w) => w[0].includes(c) && w[1]);
    if (words.length) {
      const w = words[Math.floor(Math.random() * Math.min(3, words.length))];
      const pool = [];
      others.forEach((x) => (data[x].w || []).forEach((v) => { if (v[1] && Math.abs(v[1].length - w[1].length) <= 1) pool.push(v[1]); }));
      qs.push({ type: 'Cách đọc', ask: 'Từ <b class="kq-big">' + escapeHtml(w[0]) + '</b> đọc là gì?<small>' + escapeHtml(w[3] || '') + '</small>', right: w[1], opts: uniq4(w[1], pool), cls: 'jp' });
      // ③ Cách viết: chọn từ viết đúng
      const same = others.filter((x) => data[x].r && d.r && data[x].r[0] === d.r[0]);
      const subs = kqShuffle(same).concat(kqShuffle(others)).filter((x) => !w[0].includes(x));
      const wrong = Array.from(new Set(subs.map((x) => w[0].split(c).join(x)))).slice(0, 3);
      qs.push({ type: 'Cách viết', ask: '<b class="kq-read">' + escapeHtml(w[1]) + '</b> <small>(' + escapeHtml(w[3] || '') + ')</small><br>viết bằng chữ Hán là?', right: w[0], opts: kqShuffle([w[0]].concat(wrong)), cls: 'jp big' });
    } else {
      const on = (d.on[0] || '').replace(/[.-]/g, '');
      if (on) qs.push({ type: 'Cách đọc', ask: 'Âm On của chữ <b class="kq-big">' + c + '</b> là?', right: on, opts: uniq4(on, others.map((x) => (data[x].on[0] || '').replace(/[.-]/g, ''))), cls: 'jp' });
      qs.push({ type: 'Nhận diện', ask: 'Chữ Hán nào có âm Hán Việt <b>' + escapeHtml(d.hv) + '</b>, nghĩa “' + escapeHtml(viOf(c)) + '”?', right: c, opts: uniq4(c, others), cls: 'jp big' });
    }
    return qs;
  }
  function openKQ(c) {
    if (!c || learned[c]) return;
    KQ = { c, qs: kqQuestions(c), i: 0, res: [] };
    $('kq').hidden = false;
    $('kq-title').innerHTML = '📝 Kiểm tra chữ <b>' + c + '</b>';
    drawKQ();
  }
  function closeKQ() { $('kq').hidden = true; KQ = null; }
  function kqDots() {
    $('kq-dots').innerHTML = KQ.qs.map((_, i) => '<i class="' + (i < KQ.res.length ? (KQ.res[i] ? 'ok' : 'ng') : i === KQ.i ? 'cur' : '') + '"></i>').join('');
  }
  function drawKQ() {
    kqDots();
    const q = KQ.qs[KQ.i];
    $('kq-body').innerHTML = '<div class="kq-type">Câu ' + (KQ.i + 1) + '/' + KQ.qs.length + ' · ' + q.type + '</div>' +
      '<div class="kq-ask">' + q.ask + '</div>' +
      '<div class="kq-opts ' + q.cls + '">' + q.opts.map((o, i) => '<button class="kq-opt" data-i="' + i + '"><span>' + (i + 1) + '</span>' + escapeHtml(o) + '</button>').join('') + '</div>' +
      '<div class="kq-fb" id="kq-fb"></div>';
  }
  function kqAnswer(i) {
    const q = KQ.qs[KQ.i];
    if (KQ.res.length > KQ.i) return;
    const ok = q.opts[i] === q.right;
    KQ.res.push(ok);
    document.querySelectorAll('.kq-opt').forEach((b) => {
      b.disabled = true;
      const o = q.opts[Number(b.dataset.i)];
      if (o === q.right) b.classList.add('right'); else if (Number(b.dataset.i) === i) b.classList.add('wrong');
    });
    kqDots();
    const last = KQ.i + 1 >= KQ.qs.length;
    $('kq-fb').innerHTML = '<span class="' + (ok ? 'ok' : 'ng') + '">' + (ok ? '○ せいかい！' : '× Đáp án: <b>' + escapeHtml(q.right) + '</b>') + '</span>' +
      '<button class="kq-next" id="kq-next">' + (last ? 'Xem kết quả →' : 'Câu tiếp →') + '</button>';
    $('kq-next').onclick = () => { if (last) kqResult(); else { KQ.i++; drawKQ(); } };
    $('kq-next').focus();
  }
  function kqResult() {
    const n = KQ.res.filter(Boolean).length, c = KQ.c;
    kqDots();
    if (n >= KQ_PASS) {
      $('kq-body').innerHTML = '<div class="kq-end ok">' + mascotSvg(n === KQ.qs.length ? 'grad' : 'cheer', 'kq-hiyo') +
        '<h3>' + (n === KQ.qs.length ? '💮 はなまる！' : '◎ ごうかく！') + ' ' + n + '/' + KQ.qs.length + '</h3><p>Chữ <b>' + c + '</b> đã được ghi nhớ và đưa vào lịch ôn tập.</p>' +
        '<button class="kq-next" id="kq-go">Tiếp tục →</button></div>';
      $('kq-go').onclick = () => { closeKQ(); finishChar(c); };
      $('kq-go').focus();
    } else {
      $('kq-body').innerHTML = '<div class="kq-end">' + mascotSvg('oops', 'kq-hiyo') +
        '<h3>Chưa qua: ' + n + '/' + KQ.qs.length + '</h3><p>Cần đúng ít nhất ' + KQ_PASS + ' câu. Xem lại nghĩa, cách đọc và từ vựng của chữ <b>' + c + '</b> rồi thử lại nhé!</p>' +
        '<div class="kq-btns"><button class="kq-ghost" id="kq-back">📖 Xem lại chữ</button><button class="kq-next" id="kq-retry">↺ Làm lại</button></div></div>';
      $('kq-back').onclick = () => { closeKQ(); document.querySelector('.study-body').scrollTop = 0; };
      $('kq-retry').onclick = () => openKQ(c);
    }
  }
  $('kq-body').addEventListener('click', (e) => { const b = e.target.closest('.kq-opt'); if (b && KQ) kqAnswer(Number(b.dataset.i)); });
  $('kq-close').addEventListener('click', closeKQ);

  $('study-relearn').addEventListener('click', () => {
    relearn(current, false);
    fillStudy();
  });

  function drawFav() {
    const on = SumiFav.has(current);
    $('study-fav').innerHTML = on ? '❤️' : '🤍';
    $('study-fav').classList.toggle('on', on);
    $('study-fav').title = on ? 'Bỏ khỏi chữ yêu thích' : 'Thêm vào chữ yêu thích (sổ tay ôn tập)';
  }
  $('study-fav').addEventListener('click', () => {
    const on = SumiFav.toggle(current);
    drawFav();
    toast(on ? '❤️ Đã thêm 「' + current + '」 vào chữ yêu thích – có trong Sổ tay ôn tập' : 'Đã bỏ 「' + current + '」 khỏi chữ yêu thích');
  });
  $('study-close').addEventListener('click', closeStudy);
  $('study-prev').addEventListener('click', () => go(-1));
  $('study-next').addEventListener('click', () => go(1));
  $('study').addEventListener('click', (e) => { if (e.target === $('study')) closeStudy(); });
  document.addEventListener('keydown', (e) => {
    if ($('study').hidden) return;
    if (KQ) {
      if (/^[1-4]$/.test(e.key) && KQ.res.length === KQ.i) { kqAnswer(Number(e.key) - 1); e.preventDefault(); }
      else if (e.key === 'Escape') closeKQ();
      return;
    }
    if (e.key === 'Escape') closeStudy();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // ---------- Bật/tắt furigana và dịch nghĩa ----------
  function escapeHtml(t) {
    return String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  const prefs = (() => { try { return JSON.parse(localStorage.getItem('sumiKanji.prefs')) || {}; } catch (e) { return {}; } })();
  function applyPrefs() {
    const list = $('study-sentences');
    list.classList.toggle('no-furi', prefs.furi === false);
    list.classList.toggle('no-trans', prefs.trans === false);
    $('toggle-furi').classList.toggle('on', prefs.furi !== false);
    $('toggle-furi').setAttribute('aria-pressed', prefs.furi !== false);
    $('toggle-trans').classList.toggle('on', prefs.trans !== false);
    $('toggle-trans').setAttribute('aria-pressed', prefs.trans !== false);
    $('study').classList.toggle('no-en', prefs.en === false);
    $('toggle-en').classList.toggle('on', prefs.en !== false);
    $('toggle-en').setAttribute('aria-pressed', prefs.en !== false);
  }
  function togglePref(key) {
    prefs[key] = prefs[key] === false;
    try { localStorage.setItem('sumiKanji.prefs', JSON.stringify(prefs)); } catch (e) {}
    applyPrefs();
  }
  $('toggle-furi').addEventListener('click', () => togglePref('furi'));
  $('toggle-trans').addEventListener('click', () => togglePref('trans'));
  $('toggle-en').addEventListener('click', () => togglePref('en'));
  window.addEventListener('pageshow', () => { if (chars.length) render(); });
  // Khi đang tắt dịch: nhấn vào câu để xem nghĩa câu đó
  $('study-sentences').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li && prefs.trans === false) li.classList.toggle('peek');
  });
  applyPrefs();

  // ---------- Thông báo ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
})();
