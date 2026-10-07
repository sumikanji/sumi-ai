// ===== Trang chủ: thẻ cấp độ, tiến độ, tìm kiếm =====
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('cards-grid');
  const currentView = 'grade'; // chỉ học theo khối lớp

  function renderCards() {
    const learned = loadLearned();
    const ids = Object.keys(LEVELS).filter((id) => LEVELS[id].view === currentView);
    let html = '';
    for (const id of ids) {
      const lv = LEVELS[id];
      const chars = levelChars(id);
      const done = countLearned(chars, learned);
      const pct = chars.length ? Math.round((done / chars.length) * 100) : 0;
      const P = window.SumiPath;
      const isLocked = P && !P.unlocked(id);
      const isDone = P && P.cleared(id);
      const isCur = P && !isLocked && !isDone;
      const stInfo = P && isCur ? P.stageInfo(id) : null;
      const stDone = stInfo ? stInfo.filter((x) => x.status === 'done').length : 0;
      const status = isLocked ? '<span class="lv-status locked">🔒 Hoàn thành ' + P.short(P.prereq(id)[0]) + ' để mở</span>'
        : isDone ? '<span class="lv-status done">🏆 Đã hoàn thành</span>'
          : isCur ? '<span class="lv-status cur">▶ Đang học · màn ' + Math.min(stDone + 1, stInfo.length) + '/' + stInfo.length + '</span>' : '';
      html += `
        <a class="level-card${isLocked ? ' is-locked' : ''}${isCur ? ' is-current' : ''}" href="level.html?id=${id}">
          <div>
            <span class="card-badge">${lv.badge}</span>
            <div class="card-content">
              <h3>${lv.title}</h3>
              <p>${lv.desc}</p>
            </div>
          </div>
          ${mascotSvg(lv.mascot)}
          <div class="card-progress">
            <div class="card-progress-bar"><span style="width:${pct}%"></span></div>
            <span class="card-progress-text">${done}/${chars.length}</span>
          </div>
          <div class="card-footer">
            ${status || `<div class="quantity-tag">Khối lượng: <span class="quantity-num">${chars.length} chữ</span></div>`}
            <span class="btn-circle">→</span>
          </div>
        </a>`;
    }
    html += `
      <div class="quote-card">
        <div class="quote-content">
          <div class="quote-bubble">コツコツが<br>&nbsp;&nbsp;&nbsp;力になる！</div>
          <p class="quote-sub">Kiên trì từng ngày sẽ tạo nên sức mạnh vững vàng!</p>
        </div>
        ${mascotSvg('cheer', 'quote-unko')}
      </div>`;
    grid.innerHTML = html;
    renderOverall(learned);
  }

  function renderOverall(learned) {
    const all = Object.keys(window.SUMI_INDEX || {});
    const done = countLearned(all, learned);
    const pct = all.length ? (done / all.length) * 100 : 0;
    document.getElementById('overall-progress').innerHTML = `
      <div class="overall-head">
        <span>Tổng tiến độ Jōyō Kanji</span>
        <strong>${done.toLocaleString('vi-VN')} / ${all.length.toLocaleString('vi-VN')} chữ</strong>
      </div>
      <div class="progress-track"><span style="width:${pct.toFixed(2)}%"></span></div>`;
  }
  renderCards();

  // ===== Bảng hôm nay =====
  const goalSel = document.getElementById('tp-goal-select');
  goalSel.innerHTML = Sumi.GOALS.map((g) => '<option value="' + g.v + '">' + g.label + ' – ' + g.v + '⭐ (' + g.note + ')</option>').join('');
  goalSel.addEventListener('change', () => { Sumi.setGoal(Number(goalSel.value)); renderToday(); });

  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const GARDEN = [[1, '🌱', 'Mầm non', '1–2 ngày'], [2, '🌿', 'Đang lớn', '4–7 ngày'], [3, '🌳', 'Vững vàng', '15–30 ngày'], [4, '🏆', 'Thuộc lòng', '2–4 tháng']];

  function renderToday() {
    const st = Sumi.load();
    const xp = Sumi.todayXP();
    const sk = Sumi.streakInfo();
    const $ = (id) => document.getElementById(id);
    const esc = window.sumiEsc || ((t) => String(t));

    // ----- Ôn tập ngắt quãng -----
    const due = Sumi.dueList().length;
    const total = Object.keys(st.cards).length;
    const nd = Sumi.nextDue();
    const card = $('srs-card');
    card.classList.toggle('has-due', due > 0);
    card.classList.toggle('empty', total === 0);
    $('srs-hiyo').innerHTML = HIYO.svg(currentForm(), due > 0 ? 'think' : total ? 'joy' : 'happy', { cls: 'srs-hiyo-svg' });
    $('srs-num').textContent = due > 0 ? due : total ? '✓' : '0';
    $('srs-label').innerHTML = due > 0 ? 'chữ đến hạn ôn hôm nay'
      : total === 0 ? 'Học chữ đầu tiên, ngày mai<br>chữ sẽ xuất hiện ở đây để ôn'
        : 'Đã ôn xong hôm nay!' + (nd ? '<br><small>Lượt sau: ' + (nd.inDays === 1 ? 'ngày mai' : nd.inDays + ' ngày nữa') + ' (' + nd.count + ' chữ)</small>' : '');
    const go = $('srs-go');
    if (due > 0) { go.href = 'review.html'; go.textContent = 'Bắt đầu ôn ' + due + ' chữ →'; go.className = 'srs-go'; }
    else { go.href = 'level.html?id=' + (window.SumiPath && SumiPath.current() || 'g1'); go.textContent = total ? '📖 Học chữ mới' : '📖 Học chữ đầu tiên'; go.className = 'srs-go soft'; }

    // Lịch 7 ngày tới
    const t = Sumi.today();
    const counts = [];
    for (let i = 0; i < 7; i++) counts.push(0);
    Object.values(st.cards).forEach((c) => {
      const d = Sumi.diffDays(t, c.due);
      if (d <= 0) counts[0]++; else if (d < 7) counts[d]++;
    });
    const max = Math.max(1, ...counts);
    const now = new Date();
    $('srs-bars').innerHTML = counts.map((n, i) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const lab = i === 0 ? 'Nay' : i === 1 ? 'Mai' : DOW[day.getDay()];
      return '<div class="sb' + (i === 0 ? ' today' : '') + '" title="' + lab + ': ' + n + ' chữ"><span class="sb-n">' + (n || '') + '</span><i style="height:' + (n ? Math.max(8, n / max * 100) : 3) + '%"></i><span class="sb-d">' + lab + '</span></div>';
    }).join('');

    // Vườn chữ: 4 mức nhớ
    const sc = Sumi.stageCounts();
    const sum = Math.max(1, sc[1] + sc[2] + sc[3] + sc[4]);
    $('srs-track').innerHTML = total
      ? GARDEN.map(([g]) => sc[g] ? '<i class="g' + g + '" style="flex:' + sc[g] + '" title="' + sc[g] + ' chữ"></i>' : '').join('')
      : '<i class="g0" style="flex:1"></i>';
    $('srs-legend').innerHTML = GARDEN.map(([g, ic, name, gap]) =>
      '<div class="lg g' + g + '"><span class="lg-ic">' + ic + '</span><b>' + sc[g] + '</b><span class="lg-n">' + name + '<small>ôn mỗi ' + gap + '</small></span></div>').join('');

    // ----- Học tiếp -----
    if (window.SumiPath) {
      const rk = SumiPath.rank();
      const id = rk.level;
      let sub = '', btn = '▶ Học tiếp', href = 'level.html?id=' + (id || 'thpt');
      if (!id) { sub = 'Bạn đã đi hết lộ trình 🎉'; btn = '🔁 Ôn tập'; href = 'review.html'; }
      else if (rk.boss) { sub = 'Qua hết các màn – còn <b>Thi tổng hợp</b>'; btn = '🏯 Vào thi'; href = 'test.html?level=' + id + '&n=all'; }
      else if (rk.mid) { sub = 'Xong nửa cấp – làm <b>Kiểm tra giữa cấp</b>'; btn = '📝 Kiểm tra'; href = 'test.html?level=' + id + '&n=mid'; }
      else {
        const si = SumiPath.stageInfo(id)[rk.stage - 1];
        if (si.status === 'quiz') { sub = 'Học xong màn ' + rk.stage + ' – làm <b>Kiểm tra màn</b>'; btn = '⚔️ Kiểm tra'; href = 'test.html?level=' + id + '&stage=' + rk.stage; }
        else sub = 'Màn ' + rk.stage + '/' + rk.stages + ' · đã học ' + si.learned + '/' + si.total + ' chữ';
      }
      $('next-card').href = href;
      $('next-card').innerHTML = HIYO.svg(rk.form, rk.form === 0 ? 'sleep' : 'cheer', { cls: 'nc-hiyo' }) +
        '<div class="nc-txt"><span class="nc-lv">Lv ' + rk.label + '</span><b>' + (id ? esc(LEVELS[id].title.split(' (')[0]) : 'Hoàn thành lộ trình') + '</b><small>' + sub + '</small>' +
        (id && !rk.boss ? '<span class="nc-bar"><i style="width:' + Math.round(rk.pct * 100) + '%"></i></span>' : '') + '</div>' +
        '<span class="nc-btn">' + btn + '</span>';
    }

    // ----- Mục tiêu & chuỗi -----
    $('tp-streak').textContent = sk.count;
    $('tp-flame').classList.toggle('lit', sk.todayDone);
    $('tp-streak-note').textContent = sk.todayDone ? 'Hôm nay đã đạt mục tiêu ✓'
      : 'Còn ' + Math.max(0, st.goal - xp) + '⭐ nữa ' + (sk.count > 0 ? 'để giữ chuỗi' : 'để bắt đầu chuỗi') + ' · học chữ +10, ôn đúng +3';
    $('tp-freeze').textContent = st.freezes ? '🧊×' + st.freezes : '';
    $('tp-xp').textContent = xp;
    $('tp-goal').textContent = st.goal;
    goalSel.value = String(st.goal);
    const pct = Math.min(1, xp / st.goal);
    const C = 2 * Math.PI * 27;
    const ring = $('tp-ring');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - pct);
    ring.classList.toggle('full', pct >= 1);

    // Thông báo đã dùng ngày nghỉ phép
    const notes = Sumi.takeNotes();
    const fr = notes.filter((n) => n.type === 'freeze');
    if (fr.length) {
      sumiCelebrate({
        title: '🧊 Chuỗi ngày đã được giữ!',
        sub: 'Bạn lỡ bỏ ' + fr[0].n + ' ngày, nên đã tự dùng ngày nghỉ phép.<br>🔥 Chuỗi hiện tại: <b>' + sk.count + ' ngày</b>. Học hôm nay để tiếp tục nhé!',
        mascot: 'think', button: 'Học tiếp thôi!'
      });
    }
  }

  function refreshAll() { renderCards(); renderToday(); }
  renderToday();

  // Cập nhật khi quay lại trang (học ở tab khác)
  window.addEventListener('pageshow', refreshAll);
  window.addEventListener('storage', refreshAll);

  // ===== Tìm kiếm: chữ Kanji, âm Hán Việt hoặc nghĩa tiếng Việt =====
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  function search(q) {
    q = q.trim();
    if (!q) { results.classList.remove('open'); return; }
    const idx = window.SUMI_INDEX || {};
    const nq = strip(q);
    const hits = [];
    for (const ch of Object.keys(idx)) {
      const [hv, vi, en] = idx[ch];
      let score = -1;
      if (q.includes(ch)) score = 0;
      else if (strip(hv) === nq) score = 1;
      else if (strip(hv).split(/[\s/]+/).includes(nq)) score = 2;
      else if (strip(vi).split(/[\s,;()]+/).join(' ').match(new RegExp('(^| )' + nq.replace(/[.*+?^${}()|[\]\\]/g, '') + '( |$)'))) score = 3;
      else if (nq.length >= 3 && strip(vi).includes(nq)) score = 4;
      else if (nq.length >= 3 && en && en.toLowerCase().split(/,\s*/).some((x) => x === nq || x.startsWith(nq + ' '))) score = 5;
      if (score >= 0) hits.push([score, ch, hv, vi]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    results.innerHTML = hits.length
      ? hits.slice(0, 12).map(([, ch, hv, vi]) => {
          const lv = gradeLevelOf(ch);
          return `<a class="search-item" href="level.html?id=${lv}&k=${encodeURIComponent(ch)}">
            <span class="search-kanji">${ch}</span>
            <span class="search-info"><b>${hv}</b><small>${vi} · ${LEVELS[lv].title.split(' (')[0]}</small></span>
          </a>`;
        }).join('')
      : '<div class="search-empty">Không tìm thấy chữ phù hợp</div>';
    results.classList.add('open');
  }

  input.addEventListener('input', () => search(input.value));
  input.addEventListener('focus', () => search(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.search-item');
      if (first) window.location.href = first.href;
    }
    if (e.key === 'Escape') results.classList.remove('open');
  });
  document.addEventListener('click', (e) => {
    if (!document.getElementById('search-box').contains(e.target)) results.classList.remove('open');
  });
});


// ===== Gà con Hiyo trên banner: đúng dạng tiến hóa hiện tại =====
(function () {
  const el = document.getElementById('hero-hiyo');
  if (el) el.outerHTML = mascotSvg('cheer', 'hero-unko-sensei');
})();

// ===== Cộng đồng trên trang chủ =====
(function () {
  if (!window.SumiCommunity) return;
  SumiCommunity.mountRecent(document.getElementById('home-tips'), 12);
  SumiCommunity.mountBoard(document.getElementById('home-board'), { limit: 10, metric: 'week' });
})();
