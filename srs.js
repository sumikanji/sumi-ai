// ===== Sumi Kanji — tiến độ học: ôn tập ngắt quãng, điểm, chuỗi ngày =====
// Lưu trên trình duyệt (localStorage). Mọi trang đều dùng chung file này.
(function () {
  const KEY = 'sumiKanji.v2';
  const OLD_KEY = 'sumiKanji.learned.v1';

  // Khoảng cách ôn (ngày) theo cấp độ nhớ 1..8
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60, 120];
  const MAX_STAGE = 8;

  // Điểm thưởng
  const XP = { learn: 10, reviewOk: 3, reviewBad: 1, quiz: 1 };
  const GOALS = [
    { v: 30, label: 'Thong thả', note: '~5 phút' },
    { v: 50, label: 'Đều đặn', note: '~10 phút' },
    { v: 100, label: 'Chăm chỉ', note: '~20 phút' }
  ];
  const MAX_FREEZES = 2;

  const STAGES = [
    null,
    { g: 1, icon: '🌱', name: 'Mầm non' }, { g: 1, icon: '🌱', name: 'Mầm non' },
    { g: 2, icon: '🌿', name: 'Đang lớn' }, { g: 2, icon: '🌿', name: 'Đang lớn' },
    { g: 3, icon: '🌳', name: 'Vững vàng' }, { g: 3, icon: '🌳', name: 'Vững vàng' },
    { g: 4, icon: '🏆', name: 'Thuộc lòng' }, { g: 4, icon: '🏆', name: 'Thuộc lòng' }
  ];

  // ---------- Ngày (theo giờ máy người dùng) ----------
  function ds(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function today() { return ds(new Date()); }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return ds(new Date(y, m - 1, d + n));
  }
  function diffDays(a, b) { // b - a (ngày)
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
  }

  // ---------- Lưu / đọc ----------
  function blank() {
    return { v: 2, cards: {}, days: {}, met: {}, frozen: {}, goal: 50, freezes: 0, best: { blitz: 0 }, notes: [], tests: {}, stageOk: {}, gateOk: {}, midOk: {} };
  }

  let cache = null;
  function load() {
    if (cache) return cache;
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st || st.v !== 2) {
      st = blank();
      // Chuyển dữ liệu "đã học" của phiên bản cũ
      try {
        const old = JSON.parse(localStorage.getItem(OLD_KEY)) || {};
        for (const c of Object.keys(old)) {
          const t = Number(old[c]) || Date.now();
          st.cards[c] = { s: 1, due: addDays(ds(new Date(t)), 1), t, r: 0, w: 0 };
        }
      } catch (e) { /* bỏ qua */ }
    }
    st = Object.assign(blank(), st);
    cache = st;
    applyFreezes();
    return st;
  }
  function save() {
    if (!cache) return;
    cache.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* bộ nhớ bị chặn */ }
    try { window.dispatchEvent(new CustomEvent('sumi:saved')); } catch (e) { /* bỏ qua */ }
  }
  // Thay toàn bộ dữ liệu (dùng khi đồng bộ tài khoản / nhập bản sao lưu)
  function replace(st) {
    cache = Object.assign(blank(), st);
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* bỏ qua */ }
  }
  function reset() { cache = blank(); save(); }
  // Đồng bộ khi học ở tab khác
  window.addEventListener('storage', (e) => { if (e.key === KEY) cache = null; });

  // ---------- Chuỗi ngày ----------
  function isMet(st, d) { return !!(st.met[d] || st.frozen[d]); }

  function streakInfo() {
    const st = load();
    const t = today();
    const todayDone = !!st.met[t];
    let d = todayDone ? t : addDays(t, -1);
    let n = 0;
    while (isMet(st, d) && n < 3650) { n++; d = addDays(d, -1); }
    return { count: n, todayDone };
  }

  // Tự dùng "ngày nghỉ phép" để giữ chuỗi khi lỡ bỏ ngày
  function applyFreezes() {
    const st = cache;
    const y = addDays(today(), -1);
    if (isMet(st, y)) return;
    let last = null;
    for (let i = 2; i <= 30; i++) {
      const d = addDays(today(), -i);
      if (isMet(st, d)) { last = d; break; }
    }
    if (!last) return;
    const gap = diffDays(last, y); // số ngày bị bỏ
    if (gap >= 1 && gap <= st.freezes) {
      for (let i = 1; i <= gap; i++) st.frozen[addDays(last, i)] = 1;
      st.freezes -= gap;
      st.notes.push({ type: 'freeze', n: gap });
      save();
    }
  }

  // ---------- Điểm ----------
  function todayXP() { return load().days[today()] || 0; }

  // Cộng điểm; trả về thông tin nếu vừa đạt mục tiêu hôm nay
  function addXP(n) {
    const st = load();
    const t = today();
    const before = st.days[t] || 0;
    st.days[t] = before + n;
    let goalJustMet = false;
    let freezeEarned = false;
    if (!st.met[t] && st.days[t] >= st.goal) {
      st.met[t] = 1;
      goalJustMet = true;
      const s = streakInfo().count;
      if (s > 0 && s % 7 === 0 && st.freezes < MAX_FREEZES) {
        st.freezes++;
        freezeEarned = true;
      }
    }
    save();
    return { xp: n, total: st.days[t], goal: st.goal, goalJustMet, freezeEarned, streak: streakInfo().count };
  }

  // ---------- Thẻ ôn tập ----------
  function learn(c) {
    const st = load();
    if (!st.cards[c]) {
      st.cards[c] = { s: 1, due: addDays(today(), INTERVALS[1]), t: Date.now(), r: 0, w: 0 };
      save();
      return addXP(XP.learn);
    }
    return null;
  }

  function unlearn(chars) {
    const st = load();
    (Array.isArray(chars) ? chars : [chars]).forEach((c) => { delete st.cards[c]; });
    save();
  }

  // Ghi kết quả ôn 1 chữ (chỉ tính lần trả lời đầu tiên)
  function review(c, ok) {
    const st = load();
    const card = st.cards[c];
    if (!card) return null;
    const before = card.s;
    if (ok) {
      card.s = Math.min(MAX_STAGE, card.s + 1);
      card.due = addDays(today(), INTERVALS[card.s]);
      card.r = (card.r || 0) + 1;
    } else {
      card.s = Math.max(1, card.s - 2);
      card.due = addDays(today(), 1);
      card.w = (card.w || 0) + 1;
    }
    save();
    const x = addXP(ok ? XP.reviewOk : XP.reviewBad);
    return Object.assign(x, { before, after: card.s, nextIn: INTERVALS[card.s] });
  }

  function dueList() {
    const st = load();
    const t = today();
    return Object.keys(st.cards)
      .filter((c) => st.cards[c].due <= t)
      .sort((a, b) => (st.cards[a].due < st.cards[b].due ? -1 : st.cards[a].due > st.cards[b].due ? 1 : st.cards[a].s - st.cards[b].s));
  }

  // Lượt ôn sắp tới gần nhất
  function nextDue() {
    const st = load();
    const t = today();
    let best = null;
    for (const c of Object.keys(st.cards)) {
      const d = st.cards[c].due;
      if (d > t && (!best || d < best)) best = d;
    }
    if (!best) return null;
    const n = Object.keys(st.cards).filter((c) => st.cards[c].due === best).length;
    return { date: best, inDays: diffDays(t, best), count: n };
  }

  function stageCounts() {
    const st = load();
    const out = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const c of Object.keys(st.cards)) out[STAGES[st.cards[c].s].g]++;
    return out;
  }

  function card(c) { return load().cards[c] || null; }

  function setGoal(v) {
    const st = load();
    st.goal = v;
    const t = today();
    if (!st.met[t] && (st.days[t] || 0) >= v) st.met[t] = 1;
    save();
  }

  function setBest(mode, score) {
    const st = load();
    const prev = st.best[mode] || 0;
    if (score > prev) { st.best[mode] = score; save(); return true; }
    return false;
  }

  // ---------- Kết quả bài kiểm tra (theo cấp & loại bài) ----------
  function saveTest(key, score, correct, total) {
    const st = load();
    st.tests = st.tests || {};
    const prev = st.tests[key] || { best: 0, n: 0 };
    const rec = { best: Math.max(prev.best, score), last: score, ok: correct, total, n: prev.n + 1, at: today() };
    st.tests[key] = rec;
    save();
    return { rec, isBest: score > prev.best || prev.n === 0 };
  }
  function testResult(key) { const st = load(); return (st.tests || {})[key] || null; }

  // Thông báo chờ hiển thị (vd: đã dùng ngày nghỉ phép)
  function takeNotes() {
    const st = load();
    const n = st.notes || [];
    if (n.length) { st.notes = []; save(); }
    return n;
  }

  // Lịch sử N ngày gần nhất
  function history(nDays) {
    const st = load();
    const out = [];
    for (let i = nDays - 1; i >= 0; i--) {
      const d = addDays(today(), -i);
      out.push({ date: d, xp: st.days[d] || 0, met: !!st.met[d], frozen: !!st.frozen[d] });
    }
    return out;
  }

  window.Sumi = {
    INTERVALS, STAGES, GOALS, XP, MAX_FREEZES,
    today, addDays, diffDays, load, save, replace, reset, KEY,
    learn, unlearn, review, dueList, nextDue, card, stageCounts,
    addXP, todayXP, streakInfo, setGoal, setBest, takeNotes, history, saveTest, testResult
  };

  // ---------- Hàm tương thích cho các trang cũ ----------
  window.loadLearned = function () {
    const st = load();
    const out = {};
    for (const c of Object.keys(st.cards)) out[c] = st.cards[c].t;
    return out;
  };
  window.countLearned = function (chars, learned) {
    let n = 0;
    for (const c of chars) if (learned[c]) n++;
    return n;
  };

  // ---------- Hiệu ứng ăn mừng (dùng chung) ----------
  window.sumiCelebrate = function (opts) {
    const wrap = document.createElement('div');
    wrap.className = 'fx-overlay';
    const colors = ['#fde047', '#facc15', '#fb923c', '#f472b6', '#60a5fa', '#34d399'];
    let confetti = '';
    for (let i = 0; i < 70; i++) {
      confetti += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colors[i % colors.length] +
        ';animation-delay:' + (Math.random() * 0.6).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) +
        's;transform:rotate(' + Math.round(Math.random() * 360) + 'deg)"></i>';
    }
    const mascot = (typeof mascotSvg === 'function') ? mascotSvg(opts.mascot || 'cheer', 'fx-mascot') : '';
    wrap.innerHTML = '<div class="fx-confetti">' + confetti + '</div>' +
      '<div class="fx-card" role="dialog" aria-live="polite">' + mascot +
      '<div class="fx-title">' + opts.title + '</div>' +
      (opts.sub ? '<div class="fx-sub">' + opts.sub + '</div>' : '') +
      '<button class="fx-btn">' + (opts.button || 'Tuyệt vời!') + '</button></div>';
    document.body.appendChild(wrap);
    const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); if (opts.onClose) opts.onClose(); };
    wrap.querySelector('.fx-btn').addEventListener('click', close);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    setTimeout(() => wrap.querySelector('.fx-btn').focus(), 50);
  };

  // ---------- Màn tiến hóa của gà con Hiyo ----------
  window.sumiEvolve = function (from, to, opts) {
    opts = opts || {};
    const H = typeof HIYO !== 'undefined' ? HIYO : null;
    if (!H) return window.sumiCelebrate(opts);
    const wrap = document.createElement('div');
    wrap.className = 'fx-overlay evo-overlay';
    let rays = '';
    for (let i = 0; i < 12; i++) rays += '<i style="transform:rotate(' + i * 30 + 'deg)"></i>';
    wrap.innerHTML = '<div class="fx-card evo-card" role="dialog" aria-live="polite">' +
      '<div class="evo-stage"><div class="evo-rays">' + rays + '</div>' +
      '<div class="evo-old">' + H.svg(from, from === 0 ? 'sleep' : 'happy', { cls: 'evo-svg' }) + '</div>' +
      '<div class="evo-new">' + H.svg(to, 'cheer', { cls: 'evo-svg' }) + '</div></div>' +
      '<div class="evo-text"><div class="fx-title">✨ ' + H.NAMES[from] + ' đã tiến hóa!</div>' +
      '<div class="fx-sub">' + H.NAMES[from] + ' → <b>' + H.NAMES[to] + '</b> <small>(' + H.JP[to] + ')</small>' + (opts.sub ? '<br>' + opts.sub : '') + '</div>' +
      '<button class="fx-btn">' + (opts.button || 'Tuyệt vời!') + '</button></div></div>';
    document.body.appendChild(wrap);
    const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); if (opts.onClose) opts.onClose(); };
    wrap.querySelector('.fx-btn').addEventListener('click', close);
    setTimeout(() => {
      wrap.classList.add('evolved');
      const conf = document.createElement('div');
      conf.className = 'fx-confetti';
      const colors = ['#fde047', '#facc15', '#fb923c', '#f472b6', '#60a5fa', '#34d399'];
      for (let i = 0; i < 60; i++) conf.innerHTML += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colors[i % 6] + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.2).toFixed(2) + 's"></i>';
      wrap.insertBefore(conf, wrap.firstChild);
      wrap.querySelector('.fx-btn').focus();
    }, 2300);
  };

  // Ăn mừng khi vừa đạt mục tiêu ngày
  window.sumiGoalCelebrate = function (res, onClose) {
    if (!res || !res.goalJustMet) return false;
    sumiCelebrate({
      title: '🎯 Hoàn thành mục tiêu hôm nay!',
      sub: '🔥 Chuỗi <b>' + res.streak + ' ngày</b> liên tiếp' +
        (res.freezeEarned ? '<br>🧊 Thưởng thêm 1 ngày nghỉ phép vì giữ chuỗi 7 ngày!' : '') +
        '<br><small>Muốn học thêm vẫn được cộng điểm nhé.</small>',
      button: 'Tiếp tục',
      onClose
    });
    return true;
  };
})();
