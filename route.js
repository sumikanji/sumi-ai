/*! © 2026 Sumi Kanji */
// ===== Trang Lộ trình học: hướng dẫn + bản đồ tiến độ của chính người học =====
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const P = window.SumiPath;
  const esc = window.sumiEsc || ((s) => String(s));
  const short = (id) => LEVELS[id].title.split(' (')[0];
  const jp = (id) => (LEVELS[id].title.match(/\((.+)\)/) || [])[1] || '';

  // ---------- Vị trí hiện tại ----------
  function hero() {
    const rk = P.rank();
    const st = Sumi.load();
    const learned = Object.keys(st.cards).length;
    let next = '', cta = '';
    if (!rk.level) {
      next = 'Bạn đã đi hết lộ trình. Hãy tiếp tục ôn tập để giữ Hiyo luôn khỏe!';
      cta = '<a class="rt-cta" href="review.html">🔁 Ôn tập</a>';
    } else if (rk.boss) {
      next = 'Bạn đã qua hết các màn của <b>' + esc(short(rk.level)) + '</b>. Chỉ còn <b>Thi tổng hợp</b> (từ 80 điểm) là Hiyo tiến hóa!';
      cta = '<a class="rt-cta" href="test.html?level=' + rk.level + '&n=all">🏯 Thi tổng hợp</a>';
    } else if (rk.mid) {
      next = 'Bạn đã học xong <b>nửa đầu</b> của ' + esc(short(rk.level)) + '. Làm <b>Kiểm tra giữa cấp</b> (50 câu, từ 80 điểm) để mở nửa sau.';
      cta = '<a class="rt-cta" href="test.html?level=' + rk.level + '&n=mid">📝 Kiểm tra giữa cấp</a>';
    } else {
      const si = P.stageInfo(rk.level)[rk.stage - 1];
      next = si.status === 'quiz'
        ? 'Bạn đã học đủ 10 chữ của <b>màn ' + rk.stage + '</b>. Làm <b>Kiểm tra màn</b> để mở màn tiếp theo.'
        : 'Đang ở <b>' + esc(short(rk.level)) + ' · màn ' + rk.stage + '/' + rk.stages + '</b>: đã học ' + si.learned + '/' + si.total + ' chữ của màn này.';
      cta = si.status === 'quiz'
        ? '<a class="rt-cta" href="test.html?level=' + rk.level + '&stage=' + rk.stage + '">⚔️ Kiểm tra màn ' + rk.stage + '</a>'
        : '<a class="rt-cta" href="level.html?id=' + rk.level + '">▶ Học tiếp</a>';
    }
    $('rt-hero').innerHTML =
      '<div class="rh-pic">' + HIYO.svg(rk.form, rk.form === 0 ? 'sleep' : 'cheer', { cls: 'rh-hiyo' }) + '</div>' +
      '<div class="rh-txt"><div class="rh-kicker">学習ロードマップ</div><h1>Lộ trình học</h1>' +
        '<p class="rh-sub">Mọi thứ bạn cần biết: học theo màn, mở khóa cấp mới, ôn tập ngắt quãng, thi Kanken và nuôi gà con Hiyo.</p>' +
        '<div class="rh-me"><span class="rh-lv">Lv ' + rk.label + '</span><span class="rh-name">' + esc(rk.name) + '</span><span class="rh-n">📖 ' + learned + ' chữ đã học</span></div>' +
        '<p class="rh-next">' + next + '</p>' + cta +
      '</div>';
  }

  // ---------- Bản đồ ----------
  function map() {
    const st = Sumi.load();
    const cur = P.current();
    $('rt-map').innerHTML = P.GRADES.map((id, i) => {
      const chars = levelChars(id);
      const learned = chars.filter((c) => st.cards[c]).length;
      const info = P.stageInfo(id);
      const doneSt = info.filter((x) => x.status === 'done').length;
      const s = P.cleared(id) ? 'done' : id === cur ? 'now' : 'lock';
      const pct = Math.round(learned / Math.max(1, chars.length) * 100);
      const state = s === 'done' ? '🏆 Đã qua' : s === 'now' ? '▶ Đang học · màn ' + Math.min(doneSt + 1, info.length) + '/' + info.length : '🔒 Qua ' + esc(short(P.GRADES[i - 1] || id)) + ' để mở';
      return '<a class="rm-node ' + s + '" href="level.html?id=' + id + '">' +
        '<span class="rm-mark">' + P.WORLD[id] + '</span>' +
        '<span class="rm-body"><b>' + esc(short(id)) + '</b><small>' + esc(jp(id)) + ' · ' + LEVELS[id].badge + '</small>' +
          '<span class="rm-meta">' + chars.length + ' chữ · ' + info.length + ' màn</span>' +
          '<span class="rm-bar"><i style="width:' + pct + '%"></i></span>' +
          '<span class="rm-state">' + state + '</span></span>' +
        '<span class="rm-prize" title="Phần thưởng khi qua cấp">' + HIYO.svg(i + 1, 'happy', { cls: 'rm-hiyo' + (s === 'done' ? '' : ' hidden-form') }) +
          '<em>' + (s === 'done' ? HIYO.NAMES[i + 1] : '🎁 Tiến hóa') + '</em></span>' +
      '</a>';
    }).join('');
  }

  // ---------- Tiến hóa ----------
  function evo() {
    const rk = P.rank();
    const how = ['Bắt đầu học', 'Qua Lớp 1', 'Qua Lớp 2', 'Qua Lớp 3', 'Qua Lớp 4', 'Qua Lớp 5', 'Qua Lớp 6', 'Qua THCS', 'Qua THPT'];
    $('rt-evo').innerHTML = HIYO.NAMES.map((n, i) => {
      const got = i <= rk.form;
      return '<div class="ev' + (got ? ' got' : '') + (i === rk.form ? ' now' : '') + '">' +
        HIYO.svg(i, i === 0 ? 'sleep' : 'happy', { cls: 'ev-pic' }) +
        '<b>' + (got ? esc(n) : '???') + '</b><small>' + (got ? HIYO.JP[i] : '') + '</small><em>' + how[i] + '</em>' +
        (i === rk.form ? '<span class="ev-now">Bạn ở đây</span>' : '') + '</div>';
    }).join('<span class="ev-arrow">›</span>');
  }

  // ---------- Thang ôn tập ----------
  const STEPS = [
    { s: 1, d: 1 }, { s: 2, d: 2 }, { s: 3, d: 4 }, { s: 4, d: 7 },
    { s: 5, d: 15 }, { s: 6, d: 30 }, { s: 7, d: 60 }, { s: 8, d: 120 }
  ];
  function ladder() {
    $('rt-ladder').innerHTML =
      '<div class="ld-row"><div class="ld-step learn"><i>✅</i><b>Học</b><small>Qua kiểm tra chữ</small></div>' +
      STEPS.map((x) => {
        const g = Sumi.STAGES[x.s];
        return '<div class="ld-gap">+' + x.d + ' ngày</div><div class="ld-step g' + g.g + '"><i>' + g.icon + '</i><b>Bậc ' + x.s + '</b><small>' + g.name + '</small></div>';
      }).join('') + '</div>' +
      '<div class="ld-groups">' +
        '<span class="g1">🌱 Mầm non · ôn mỗi 1–2 ngày</span><span class="g2">🌿 Đang lớn · 4–7 ngày</span>' +
        '<span class="g3">🌳 Vững vàng · 15–30 ngày</span><span class="g4">🏆 Thuộc lòng · 2–4 tháng</span></div>';
  }

  // ---------- Mô phỏng ----------
  const sim = { s: 1, day: 1, log: [] };
  function simDraw() {
    const g = Sumi.STAGES[sim.s];
    const gap = sim.lastGap || 1;
    $('sim-info').innerHTML = '<span class="sim-st g' + g.g + '">' + g.icon + ' Bậc ' + sim.s + ' · ' + g.name + '</span>' +
      '<span>Hôm nay: <b>ngày ' + sim.day + '</b></span><span>Lần ôn tới: <b>' + gap + ' ngày nữa</b> (ngày ' + (sim.day + gap) + ')</span>';
    $('sim-log').innerHTML = sim.log.slice(-6).map((l) => '<div>' + l + '</div>').join('');
  }
  function simAct(ok) {
    const gapNow = sim.lastGap || 1;
    sim.day += gapNow;
    const before = sim.s;
    if (ok) sim.s = Math.min(8, sim.s + 1); else sim.s = Math.max(1, sim.s - 2);
    sim.last = ok ? 'ok' : 'ng';
    sim.lastGap = ok ? Sumi.INTERVALS[sim.s] : 1;
    sim.log.push((ok ? '✅' : '❌') + ' Ngày ' + sim.day + ': bậc ' + before + ' → ' + sim.s + ', hẹn ' + sim.lastGap + ' ngày sau');
    simDraw();
  }
  $('sim-ok').onclick = () => simAct(true);
  $('sim-ng').onclick = () => simAct(false);
  $('sim-reset').onclick = () => { Object.assign(sim, { s: 1, day: 1, log: [], last: null, lastGap: 1 }); simDraw(); };

  // ---------- Số liệu của bạn ----------
  function mine() {
    const c = Sumi.stageCounts();
    const due = (Sumi.dueList() || []).length;
    $('rt-mine').innerHTML = '<b>Của bạn:</b>' +
      '<span>🌱 ' + c[1] + '</span><span>🌿 ' + c[2] + '</span><span>🌳 ' + c[3] + '</span><span>🏆 ' + c[4] + '</span>' +
      (due ? '<a class="rt-cta sm" href="review.html">🔁 Ôn ' + due + ' chữ đến hạn</a>' : '<span class="ok">✨ Hôm nay không có chữ nào cần ôn</span>');
    const st = Sumi.load();
    const t = Sumi.today();
    const xp = st.days[t] || 0;
    const sk = Sumi.streakInfo();
    $('rt-today').innerHTML = '<b>Hôm nay:</b><span>⭐ ' + xp + ' / ' + st.goal + '</span><span>🔥 ' + sk.count + ' ngày liên tiếp</span><span>🧊 ' + (st.freezes || 0) + '/' + Sumi.MAX_FREEZES + ' ngày nghỉ</span>' +
      '<a class="rt-cta sm" href="index.html">🏠 Về trang chủ</a>';
  }

  // ---------- Kanken ----------
  function kanken() {
    const pairs = [['g1', ['k10']], ['g2', ['k9']], ['g3', ['k8']], ['g4', ['k7']], ['g5', ['k6']], ['g6', ['k5']], ['thcs', ['k4', 'k3']], ['thpt', ['k2s', 'k2']]];
    $('rt-kk').innerHTML = '<table class="rt-table kk"><thead><tr><th>Cấp học</th><th>Kanken</th><th>Trạng thái đề thi thử</th></tr></thead><tbody>' +
      pairs.map(([g, ks]) => '<tr><td><span class="kk-mark">' + P.WORLD[g] + '</span> ' + esc(short(g)) + '</td><td>' +
        ks.map((k) => LEVELS[k].title.replace('Kanken ', '')).join(' · ') + '</td><td>' +
        ks.map((k) => P.unlocked(k) ? '<a href="kanken.html">🔓 ' + LEVELS[k].title.replace('Kanken ', '') + '</a>' : '<span class="lk">🔒 ' + LEVELS[k].title.replace('Kanken ', '') + '</span>').join(' ') +
        '</td></tr>').join('') + '</tbody></table>';
  }

  function draw() { hero(); map(); evo(); ladder(); simDraw(); mine(); kanken(); }
  draw();
  window.addEventListener('sumi:saved', draw);
  if (location.hash) setTimeout(() => { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }, 50);
});
