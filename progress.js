// ===== Sumi Kanji — lộ trình bắt buộc kiểu game =====
// • Mỗi chữ: học xong phải qua "Kiểm tra chữ" (3 câu) mới được tính là đã học.
// • Mỗi MÀN 10 chữ: học hết → "Kiểm tra màn" (≥ 80%) → mở màn tiếp.
// • Học hết NỬA cấp: "Kiểm tra giữa cấp" 50 câu (≥ 80 điểm) → mở nửa sau.
// • Học hết cấp: "Thi tổng hợp" toàn bộ chữ (≥ 80 điểm) → mở cấp tiếp theo + Hiyo tiến hóa.
// • Đã biết sẵn? Thi tổng hợp đạt ≥ 90 điểm là VƯỢT CẤP ngay.
(function () {
  const GRADES = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'thcs', 'thpt'];
  const KMAP = { k10: 'g1', k9: 'g2', k8: 'g3', k7: 'g4', k6: 'g5', k5: 'g6' };
  const SIZE = 10, PASS = 80, SKIP = 90;

  function st() {
    const s = Sumi.load();
    s.stageOk = s.stageOk || {};
    s.gateOk = s.gateOk || {};
    s.midOk = s.midOk || {};
    return s;
  }
  const short = (id) => LEVELS[id].title.split(' (')[0];

  // Chia chữ của cấp thành các màn 10 chữ (màn cuối quá ít thì gộp vào màn trước)
  const _stages = {};
  function stages(id) {
    if (_stages[id]) return _stages[id];
    const c = levelChars(id), out = [];
    for (let i = 0; i < c.length; i += SIZE) out.push(c.slice(i, i + SIZE));
    if (out.length > 1 && out[out.length - 1].length < 5) { const l = out.pop(); out[out.length - 1] = out[out.length - 1].concat(l); }
    return (_stages[id] = out);
  }

  // Đã qua bài thi cấp thì vẫn tính là hoàn thành, kể cả khi bấm "Học lại" vài chữ
  const charsCleared = (chars) => { const s = st(); return chars.length > 0 && chars.every((c) => s.gateOk[c]); };
  const cleared = (id) => charsCleared(levelChars(id));

  // Các cấp phải hoàn thành trước khi mở cấp id
  function prereq(id) {
    if (GRADES.includes(id)) { const i = GRADES.indexOf(id); return i ? [GRADES[i - 1]] : []; }
    if (KMAP[id]) return prereq(KMAP[id]);
    return { k4: ['k5'], k3: ['k4'], k2s: ['k3'], k2: ['k2s'] }[id] || [];
  }
  const unlocked = (id) => prereq(id).every(cleared);
  // Cấp đang học (theo khối lớp): cấp đầu tiên chưa hoàn thành
  const current = () => GRADES.find((g) => !cleared(g)) || null;

  // ---------- Kiểm tra giữa cấp ----------
  // Số màn của nửa đầu (0 = cấp quá nhỏ, không có kiểm tra giữa cấp)
  const half = (id) => { const n = stages(id).length; return n >= 2 ? Math.ceil(n / 2) : 0; };
  const midChars = (id) => stages(id).slice(0, half(id)).flat();
  const midPassed = (id) => { const s = st(); return !half(id) || !!s.midOk[id] || cleared(id); };
  function passMid(id) { const s = st(); s.midOk[id] = 1; Sumi.save(); }

  // Trạng thái từng màn: done | quiz (học xong, chờ kiểm tra) | open | locked
  // locked + needMid: đang chờ qua kiểm tra giữa cấp
  function stageInfo(id) {
    const s = st();
    const h = half(id), midOk = midPassed(id);
    let open = unlocked(id);
    return stages(id).map((chars, i) => {
      const learned = chars.filter((c) => s.cards[c]).length;
      const done = chars.every((c) => s.stageOk[c]); // đã qua kiểm tra màn thì màn luôn mở, kể cả khi học lại vài chữ
      let needMid = false;
      if (h && i === h && !midOk && !done) { needMid = open; open = false; }
      const status = done ? 'done' : !open ? 'locked' : learned === chars.length ? 'quiz' : 'open';
      if (!done) open = false;
      return { i, no: i + 1, chars, learned, total: chars.length, status, needMid };
    });
  }
  // 'none' | 'locked' (chưa học xong nửa đầu) | 'ready' (chờ kiểm tra) | 'done'
  function midState(id) {
    if (!half(id)) return 'none';
    if (midPassed(id)) return 'done';
    const info = stageInfo(id).slice(0, half(id));
    return unlocked(id) && info.every((x) => x.status === 'done') ? 'ready' : 'locked';
  }
  function stageOf(id, c) { return stageInfo(id).find((x) => x.chars.includes(c)) || null; }
  const charOpen = (id, c) => { const x = stageOf(id, c); return !!x && x.status !== 'locked'; };
  const allStagesDone = (id) => stageInfo(id).every((x) => x.status === 'done');

  // Điểm cao nhất bài thi tổng hợp
  function gateBest(id) {
    const b = Sumi.testResult(id + ':all');
    return b ? b.best : 0;
  }

  // ---------- Ghi nhận ----------
  function passStage(chars) {
    const s = st();
    chars.forEach((c) => { s.stageOk[c] = 1; });
    Sumi.save();
  }
  function passGate(id) {
    const s = st();
    levelChars(id).forEach((c) => { s.gateOk[c] = 1; s.stageOk[c] = 1; });
    Sumi.save();
  }
  // Vượt cấp: các chữ chưa học được đưa vào ôn tập ở mức "Đang lớn"
  function skipLevel(id) {
    const s = st();
    const t = Sumi.today();
    let n = 0;
    levelChars(id).forEach((c) => {
      if (!s.cards[c]) { s.cards[c] = { s: 3, due: Sumi.addDays(t, 2 + (n % 5)), t: Date.now(), r: 0, w: 0 }; n++; }
      s.gateOk[c] = 1; s.stageOk[c] = 1;
    });
    s.midOk[id] = 1;
    Sumi.save();
    return n;
  }
  // Cấp mở ra sau khi hoàn thành id
  function nextOf(id) {
    const all = GRADES.concat(Object.keys(KMAP), ['k4', 'k3', 'k2s', 'k2']);
    return all.filter((x) => prereq(x).includes(id) && LEVELS[x].view === LEVELS[id].view)[0] || null;
  }

  // ---------- Chuyển dữ liệu cũ: màn đã học hết được tính là đã qua ----------
  function migrate() {
    const s = st();
    if (s.pathV === 2) return;
    if (s.pathV === 1) {
      // v2: thêm kiểm tra giữa cấp → ai đã qua màn ở nửa sau thì coi như đã qua
      Object.keys(LEVELS).forEach((id) => {
        const h = half(id);
        if (h && stages(id).slice(h).some((ch) => ch.every((c) => s.stageOk[c]))) s.midOk[id] = 1;
      });
      s.pathV = 2;
      Sumi.save();
      return;
    }
    Object.keys(LEVELS).forEach((id) => {
      stages(id).forEach((chars) => { if (chars.every((c) => s.cards[c])) chars.forEach((c) => { s.stageOk[c] = 1; }); });
      const chars = levelChars(id);
      const b50 = Sumi.testResult(id + ':50');
      if (chars.every((c) => s.cards[c]) && Math.max(gateBest(id), b50 ? b50.best : 0) >= PASS) chars.forEach((c) => { s.gateOk[c] = 1; });
      const h = half(id);
      if (h && stages(id).slice(h).some((ch) => ch.every((c) => s.stageOk[c]))) s.midOk[id] = 1;
    });
    s.pathV = 2;
    Sumi.save();
  }

  // Ký hiệu cấp kiểu Nhật: 小1…小6 (tiểu học lớp 1–6), 中 (THCS), 高 (THPT)
  const WORLD = { g1: '小1', g2: '小2', g3: '小3', g4: '小4', g5: '小5', g6: '小6', thcs: '中', thpt: '高' };
  // Cấp – màn hiện tại kiểu game: 小1-1 … 高-52, 極 khi học hết. form = dạng tiến hóa của gà con
  function rank() {
    const cur = current();
    if (!cur) return { world: 9, stage: null, stages: 0, boss: false, label: '極', form: 8, mark: '極', level: null, pct: 1, name: HIYO.NAMES[8] };
    const w = GRADES.indexOf(cur) + 1;
    const info = stageInfo(cur);
    const curSt = info.find((x) => x.status !== 'done');
    const boss = !curSt;
    const mid = !boss && curSt.needMid;
    return {
      world: w, stage: boss ? null : curSt.no, stages: info.length, boss, mid, level: cur,
      label: WORLD[cur] + '-' + (boss ? '🏯' : mid ? '📝' : curSt.no), mark: WORLD[cur], form: w - 1, name: HIYO.NAMES[w - 1],
      pct: boss ? 1 : curSt.learned / curSt.total
    };
  }

  window.SumiPath = {
    rank, WORLD,
    GRADES, SIZE, PASS, SKIP, stages, stageInfo, stageOf, charOpen, allStagesDone, cleared, unlocked, prereq, current,
    gateBest, passStage, passGate, skipLevel, nextOf, short, migrate,
    half, midChars, midState, passMid
  };
  if (window.SUMI_KANKEN) migrate();
  else document.addEventListener('DOMContentLoaded', migrate);
})();
