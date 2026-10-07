// ===== Trang cá nhân: hồ sơ, avatar, chỉ số, bảng điểm, thành tích, cài đặt =====
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = sumiEsc;
  const A = window.SumiAccount;
  const { Profile, AV, avatarSvg } = A;
  const P = window.SumiPath;
  const GRADE_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'thcs', 'thpt'];
  const KANKEN_IDS = ['k10', 'k9', 'k8', 'k7', 'k6', 'k5', 'k4', 'k3', 'k2s', 'k2'];
  const KNAME = { k10: '10級', k9: '9級', k8: '8級', k7: '7級', k6: '6級', k5: '5級', k4: '4級', k3: '3級', k2s: '準2級', k2: '2級' };
  const KPASS = { k10: 120, k9: 120, k8: 120, k7: 140, k6: 140, k5: 140, k4: 140, k3: 140, k2s: 140, k2: 160 };
  const KFULL = { k10: 150, k9: 150, k8: 150 };
  const TOTAL = 2136;

  // Danh hiệu theo số chữ đã học
  const TITLES = [
    [0, '入門', 'Người mới bắt đầu'], [20, '見習い', 'Tập sự'], [80, '初段', 'Sơ đẳng'], [240, '中級', 'Trung cấp'],
    [642, '上級', 'Cao cấp'], [1026, '漢字通', 'Thông thạo chữ Hán'], [1623, '漢字名人', 'Danh nhân chữ Hán'], [2136, '漢字博士', 'Tiến sĩ chữ Hán']
  ];

  // ---------- Tính chỉ số ----------
  function computeStats() {
    const st = Sumi.load();
    const learned = Object.keys(st.cards).length;
    const days = Object.keys(st.days).filter((d) => st.days[d] > 0);
    const totalXP = days.reduce((a, d) => a + st.days[d], 0);
    const okDays = Object.keys(Object.assign({}, st.met, st.frozen)).sort();
    let longest = 0, run = 0, prev = null;
    okDays.forEach((d) => { run = prev && Sumi.diffDays(prev, d) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
    const tests = st.tests || {};
    const keys = Object.keys(tests);
    const kk = keys.filter((k) => k.startsWith('kanken:'));
    const lv = keys.filter((k) => !k.startsWith('kanken:'));
    const kkPass = kk.filter((k) => tests[k].best >= KPASS[k.split(':')[1]]);
    const reviews = Object.values(st.cards).reduce((a, c) => a + (c.r || 0) + (c.w || 0), 0);
    return {
      st, learned, totalXP, activeDays: days.length, streak: Sumi.streakInfo().count, longest, best: st.best.blitz || 0,
      testsDone: lv.reduce((a, k) => a + (tests[k].n || 0), 0), tests100: lv.filter((k) => tests[k].best === 100).length,
      kkDone: kk.reduce((a, k) => a + (tests[k].n || 0), 0), kkPass: kkPass.length, kkPassLv: new Set(kkPass.map((k) => k.split(':')[1])),
      stages: Sumi.stageCounts(), reviews, master: Sumi.stageCounts()[4]
    };
  }

  // ---------- Thành tích ----------
  const BADGES = [
    ['first', '🌱', 'Chữ đầu tiên', 'Học xong 1 chữ', (s) => s.learned >= 1],
    ['k10', '📗', 'Hoàn thành Lớp 1', 'Học đủ 80 chữ lớp 1', (s) => levelDone('g1')],
    ['c100', '💯', '100 chữ', 'Học xong 100 chữ', (s) => s.learned >= 100],
    ['c500', '📚', '500 chữ', 'Học xong 500 chữ', (s) => s.learned >= 500],
    ['kyoiku', '🎒', 'Hết tiểu học', 'Học đủ 1.026 chữ tiểu học', (s) => GRADE_IDS.slice(0, 6).every(levelDone)],
    ['joyo', '👑', 'Toàn bộ Jōyō', 'Học đủ 2.136 chữ', (s) => s.learned >= TOTAL],
    ['s3', '🔥', 'Chuỗi 3 ngày', 'Đạt mục tiêu 3 ngày liền', (s) => s.longest >= 3],
    ['s7', '🔥', 'Chuỗi 7 ngày', 'Đạt mục tiêu 7 ngày liền', (s) => s.longest >= 7],
    ['s30', '🌋', 'Chuỗi 30 ngày', 'Đạt mục tiêu 30 ngày liền', (s) => s.longest >= 30],
    ['s100', '☄️', 'Chuỗi 100 ngày', 'Đạt mục tiêu 100 ngày liền', (s) => s.longest >= 100],
    ['xp1k', '⭐', '1.000 điểm', 'Tích lũy 1.000⭐', (s) => s.totalXP >= 1000],
    ['xp10k', '🌟', '10.000 điểm', 'Tích lũy 10.000⭐', (s) => s.totalXP >= 10000],
    ['rev100', '🔁', 'Chăm ôn tập', 'Ôn 100 lượt', (s) => s.reviews >= 100],
    ['master', '🏆', 'Thuộc lòng', 'Có 50 chữ đạt cấp 🏆 Thuộc lòng', (s) => s.master >= 50],
    ['t100', '💮', 'はなまる', 'Đạt 100 điểm một bài kiểm tra', (s) => s.tests100 >= 1],
    ['kk1', '🎌', 'Đỗ thi thử Kanken', 'Đỗ 1 đề thi thử Kanken', (s) => s.kkPass >= 1],
    ['kk5', '🎓', 'Chinh phục Kanken', 'Đỗ thi thử ở 5 cấp khác nhau', (s) => s.kkPassLv.size >= 5],
    ['kk2', '🏯', 'Đỗ Kanken 2級', 'Đỗ một đề thi thử 2級', (s) => s.kkPassLv.has('k2')],
    ['mid1', '📝', 'Nửa chặng', 'Qua 1 bài kiểm tra giữa cấp', (s) => Object.keys(s.st.midOk || {}).length >= 1],
    ['all1', '🏯', 'Lên lớp', 'Qua 1 bài thi tổng hợp', (s) => SumiPath.GRADES.some((g) => SumiPath.cleared(g))]
  ];
  function levelDone(id) {
    const learned = loadLearned();
    const chars = levelChars(id);
    return chars.length > 0 && chars.every((c) => learned[c]);
  }

  // ---------- Hồ sơ ----------
  function renderHero(s) {
    const p = Profile.get();
    const sess = A.Auth.session();
    $('pf-avatar').innerHTML = avatarSvg(p.avatar, 'pf-av') + '<span class="pf-av-edit">🎨</span>';
    $('pf-name').textContent = A.displayName();
    let ti = 0;
    TITLES.forEach((t, i) => { if (s.learned >= t[0]) ti = i; });
    const t = TITLES[ti], nx = TITLES[ti + 1];
    const rk = P.rank();
    $('pf-title').innerHTML = '<span class="ti-lv">Lv ' + rk.label + '</span> <span class="ti-jp">' + t[1] + '</span> ' + t[2] + ' · 🐣 ' + rk.name;
    $('pf-next').innerHTML = nx
      ? '<div class="pn-bar"><i style="width:' + ((s.learned - t[0]) / (nx[0] - t[0]) * 100).toFixed(1) + '%"></i></div><small>Còn <b>' + (nx[0] - s.learned) + '</b> chữ để lên <b>' + nx[1] + '</b> ' + nx[2] + '</small>'
      : '<small>Bạn đã đạt danh hiệu cao nhất! 🎉</small>';
    if (sess) {
      const sync = A.Auth.isFirebase()
        ? ({ ok: '☁️ Đã đồng bộ', syncing: '⏳ Đang đồng bộ…', error: '⚠️ Lỗi đồng bộ' }[A.Cloud.status] || '☁️ Đồng bộ đám mây')
        : '💾 Lưu trên máy này';
      $('pf-acct').innerHTML = '<span class="acct-chip">' + esc(A.providerLabel(sess).split(' · ')[0]) + (sess.email ? ' · ' + esc(sess.email) : '') + '</span><span class="acct-chip soft">' + sync + '</span>';
      $('pf-hero-actions').innerHTML = '<button class="pf-btn" id="pf-out">↩ Đăng xuất</button>';
      $('pf-out').onclick = () => A.signOut();
    } else {
      $('pf-acct').innerHTML = '<span class="acct-chip soft">👤 Khách · tiến độ đang lưu trên máy này</span>';
      $('pf-hero-actions').innerHTML = '<button class="acct-login big" id="pf-login">Đăng nhập / Tạo tài khoản</button><small>Gmail · Apple ID · Email</small>';
      $('pf-login').onclick = () => A.openLogin('signin');
    }
    const since = new Date(p.createdAt || Date.now());
    $('pf-acct').innerHTML += '<span class="acct-chip soft">📅 Tham gia ' + since.toLocaleDateString('vi-VN') + '</span>';
  }

  function renderStats(s) {
    const tiles = [
      ['📖', s.learned, 'Chữ đã học', '/ ' + TOTAL.toLocaleString('vi-VN')],
      ['⭐', s.totalXP.toLocaleString('vi-VN'), 'Tổng điểm', 'hôm nay ' + Sumi.todayXP() + '/' + s.st.goal],
      ['🔥', s.streak, 'Chuỗi hiện tại', 'ngày'],
      ['🏔', s.longest, 'Chuỗi dài nhất', 'ngày'],
      ['📅', s.activeDays, 'Ngày đã học', 'ngày'],
      ['📝', s.testsDone, 'Bài kiểm tra', s.tests100 ? s.tests100 + ' lần 💮' : 'đã làm'],
      ['🎌', s.kkPass, 'Đề Kanken đỗ', s.kkDone + ' lần thi'],
      ['🔁', Sumi.dueList().length, 'Cần ôn hôm nay', 'chữ']
    ];
    $('pf-stats').innerHTML = tiles.map(([i, v, l, sub]) => '<div class="stat-tile"><span class="sti">' + i + '</span><b>' + v + '</b><span class="stl">' + l + '</span><small>' + sub + '</small></div>').join('');
  }

  function renderLevels(s) {
    const learned = loadLearned();
    $('pf-levels').innerHTML = GRADE_IDS.map((id) => {
      const chars = levelChars(id), n = countLearned(chars, learned);
      const pct = chars.length ? n / chars.length * 100 : 0;
      return '<a class="lvb" href="level.html?id=' + id + '"><span class="lvn">' + esc(LEVELS[id].title.split(' (')[0]) + '</span>' +
        '<span class="lvt"><i style="width:' + pct.toFixed(1) + '%"></i></span><span class="lvc">' + n + '/' + chars.length + '</span></a>';
    }).join('');
    const sc = s.stages;
    $('pf-stages').innerHTML = [[1, '🌱', 'Mầm non'], [2, '🌿', 'Đang lớn'], [3, '🌳', 'Vững vàng'], [4, '🏆', 'Thuộc lòng']]
      .map(([g, i, n]) => '<div class="stg"><span>' + i + '</span><b>' + sc[g] + '</b><small>' + n + '</small></div>').join('');
  }

  function renderHeat(s) {
    const weeks = 26;
    const todayDow = (new Date().getDay() + 6) % 7;
    const n = (weeks - 1) * 7 + todayDow + 1;
    const hist = Sumi.history(n);
    const goal = s.st.goal;
    $('pf-heat').innerHTML = hist.map((d) => {
      const lv = d.frozen && !d.met ? 'f' : d.xp === 0 ? 0 : d.met ? (d.xp >= goal * 2 ? 4 : 3) : d.xp >= goal / 2 ? 2 : 1;
      return '<i class="h' + lv + '" title="' + d.date + ': ' + d.xp + '⭐"></i>';
    }).join('');
    const xp = hist.reduce((a, d) => a + d.xp, 0);
    $('pf-heat-note').textContent = hist.filter((d) => d.xp > 0).length + ' ngày học · ' + xp.toLocaleString('vi-VN') + '⭐';
  }

  // ---------- Sổ tiến hóa ----------
  function renderEvo() {
    const rk = P.rank();
    const how = ['Bắt đầu', 'Qua Lớp 1', 'Qua Lớp 2', 'Qua Lớp 3', 'Qua Lớp 4', 'Qua Lớp 5', 'Qua Lớp 6', 'Qua THCS', 'Học hết 2.136 chữ'];
    $('evo-book').innerHTML = HIYO.NAMES.map((n, i) => {
      const got = i <= rk.form;
      return '<div class="evo-cell' + (got ? ' got' : '') + (i === rk.form ? ' now' : '') + '">' + HIYO.svg(i, got ? (i === 0 ? 'sleep' : 'happy') : 'happy', { cls: 'evo-pic' }) +
        '<b>' + (got ? n : '???') + '</b><small>' + (got ? HIYO.JP[i] : '') + '</small><em>' + how[i] + '</em>' + (i === rk.form ? '<span class="evo-now">Hiện tại</span>' : '') + '</div>';
    }).join('');
    $('evo-note').textContent = (rk.form + 1) + ' / ' + HIYO.COUNT + ' dạng đã mở';
  }

  // ---------- Bảng điểm ----------
  let scTab = 'test';
  function renderScores() {
    const st = Sumi.load();
    const T = st.tests || {};
    document.querySelectorAll('#sc-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === scTab));
    const cell = (r, pass) => r
      ? '<td class="' + (r.best >= pass ? 'pass' : '') + '"><b>' + r.best + '</b>' + (r.best === 100 && pass === 80 ? ' 💮' : '') + '<small>' + r.n + ' lần · ' + fmtDate(r.at) + '</small></td>'
      : '<td class="none">—</td>';
    let h = '';
    if (scTab === 'test') {
      h = '<table class="sc-table"><thead><tr><th>Cấp</th><th>⚔️ Kiểm tra màn<small>đã qua</small></th><th>📝 Giữa cấp<small>50 câu</small></th><th>🏯 Tổng hợp<small>toàn bộ</small></th></tr></thead><tbody>' +
        GRADE_IDS.map((id) => {
          const info = SumiPath.stageInfo(id), dn = info.filter((x) => x.status === 'done').length;
          return '<tr><th><a href="level.html?id=' + id + '">' + esc(LEVELS[id].title.split(' (')[0]) + '</a></th>' +
            '<td class="' + (dn === info.length ? 'pass' : dn ? '' : 'none') + '"><b>' + dn + '/' + info.length + '</b><small>màn</small></td>' +
            cell(T[id + ':mid'], 80) + cell(T[id + ':all'], 80) + '</tr>';
        }).join('') + '</tbody></table>' +
        '<p class="sc-note">Điểm cao nhất (thang 100). Ô màu đỏ là đã đạt từ 80 điểm.</p>';
    } else if (scTab === 'kanken') {
      h = '<table class="sc-table kk"><thead><tr><th>Cấp</th>' + [1, 2, 3, 4, 5].map((n) => '<th>第' + n + '回</th>').join('') + '</tr></thead><tbody>' +
        KANKEN_IDS.map((L) => '<tr><th><a href="kanken.html?level=' + L + '">' + KNAME[L] + '</a></th>' +
          [1, 2, 3, 4, 5].map((n) => {
            const r = T['kanken:' + L + ':' + n];
            return r ? '<td class="' + (r.best >= KPASS[L] ? 'pass' : 'fail') + '"><b>' + r.best + '</b><small>' + (r.best >= KPASS[L] ? '合格' : 'chưa đỗ') + '</small></td>' : '<td class="none">—</td>';
          }).join('') + '</tr>').join('') + '</tbody></table>' +
        '<p class="sc-note">Điểm cao nhất mỗi đề. Đỗ: 10〜8級 từ 120/150, 7級〜準2級 từ 140/200, 2級 từ 160/200.</p>';
    } else {
      h = '<div class="game-best"><span>📚</span><div><b>' + Sumi.dueList().length + ' chữ</b><small>Cần ôn hôm nay</small></div>' +
        '<a class="pf-btn" href="review.html">Ôn tập</a></div>';
    }
    $('sc-body').innerHTML = h;
  }
  function fmtDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd + '/' + m; }
  $('sc-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { scTab = b.dataset.t; renderScores(); } });

  function renderBadges(s) {
    let got = 0;
    $('pf-badges').innerHTML = BADGES.map(([id, icon, name, desc, test]) => {
      const ok = test(s); if (ok) got++;
      return '<div class="badge' + (ok ? ' got' : '') + '" title="' + esc(desc) + '"><span>' + icon + '</span><b>' + esc(name) + '</b><small>' + esc(desc) + '</small></div>';
    }).join('');
    $('pf-badge-count').textContent = got + ' / ' + BADGES.length + ' đã mở khóa';
  }

  // ---------- Xưởng avatar ----------
  function curAv() {
    const a = Object.assign({ bg: AV.bg[0], face: 'happy', acc: 'none', form: 'auto', tint: AV.body[0] }, Profile.get().avatar || {});
    if (!AV.face.includes(a.face)) a.face = a.face === 'smile' ? 'happy' : a.face === 'happy' ? 'joy' : 'happy';
    if (!AV.acc.includes(a.acc)) a.acc = 'none';
    return a;
  }
  function setAv(patch) { Profile.set({ avatar: Object.assign(curAv(), patch) }); renderStudio(); renderHero(computeStats()); }
  function renderStudio() {
    const av = curAv();
    $('st-preview').innerHTML = avatarSvg(av, 'st-av');
    const maxF = currentForm();
    $('st-form').innerHTML = '<button class="' + (av.form === 'auto' || av.form == null ? 'on' : '') + '" data-v="auto" title="Tự lớn lên theo cấp">' + avatarSvg(Object.assign({}, av, { photo: null, form: 'auto' }), 'mini-av') + '<small>Theo cấp</small></button>' +
      HIYO.NAMES.map((n, i) => i <= maxF
        ? '<button class="' + (String(av.form) === String(i) ? 'on' : '') + '" data-v="' + i + '" title="' + n + '">' + avatarSvg(Object.assign({}, av, { photo: null, fixed: i }), 'mini-av') + '<small>' + n + '</small></button>'
        : '<button disabled title="Chưa mở khóa">' + HIYO.svg(i, 'happy', { cls: 'mini-av locked-av' }) + '<small>???</small></button>').join('');
    $('st-body').innerHTML = AV.body.map((c) => '<button style="background:' + c + '" class="' + ((av.tint || AV.body[0]) === c && !av.photo ? 'on' : '') + '" data-v="' + c + '" aria-label="Màu ' + c + '"></button>').join('');
    $('st-bg').innerHTML = AV.bg.map((c) => '<button style="background:' + c + '" class="' + (av.bg === c && !av.photo ? 'on' : '') + '" data-v="' + c + '" aria-label="Nền ' + c + '"></button>').join('');
    const base = Object.assign({}, av, { photo: null });
    $('st-face').innerHTML = AV.face.map((f) => '<button class="' + (av.face === f ? 'on' : '') + '" data-v="' + f + '" title="' + AV.FACE_NAME[f] + '">' + avatarSvg(Object.assign({}, base, { face: f, acc: 'none' }), 'mini-av') + '<small>' + AV.FACE_NAME[f] + '</small></button>').join('');
    $('st-acc').innerHTML = AV.acc.map((a) => '<button class="' + (av.acc === a ? 'on' : '') + '" data-v="' + a + '" title="' + AV.ACC_NAME[a] + '">' + avatarSvg(Object.assign({}, base, { acc: a }), 'mini-av') + '<small>' + AV.ACC_NAME[a] + '</small></button>').join('');
    $('st-blush').closest('label').hidden = true;
    $('st-unphoto').hidden = !av.photo;
    document.querySelector('.st-opts').classList.toggle('photo-on', !!av.photo);
  }
  const pickers = { 'st-body': 'tint', 'st-bg': 'bg', 'st-face': 'face', 'st-acc': 'acc', 'st-form': 'form' };
  Object.keys(pickers).forEach((id) => $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    setAv({ [pickers[id]]: b.dataset.v, photo: null });
  }));
  $('st-blush').onchange = (e) => setAv({ blush: e.target.checked });
  $('st-random').onclick = () => {
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    setAv({ tint: r(AV.body), bg: r(AV.bg), face: r(AV.face), acc: r(AV.acc), photo: null });
  };
  $('st-unphoto').onclick = () => setAv({ photo: null });
  $('st-photo').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const S = 192, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const k = Math.max(S / img.width, S / img.height);
      const w = img.width * k, h = img.height * k;
      cv.getContext('2d').drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      setAv({ photo: cv.toDataURL('image/jpeg', 0.85) });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
    e.target.value = '';
  };
  $('pf-avatar').onclick = () => $('avatar').scrollIntoView({ behavior: 'smooth' });
  $('pf-edit-name').onclick = () => {
    const n = prompt('Tên hiển thị của bạn:', A.displayName() === 'Khách' ? '' : A.displayName());
    if (n != null && n.trim()) { Profile.set({ name: n.trim().slice(0, 30) }); renderHero(computeStats()); }
  };

  // ---------- Cài đặt ----------
  function renderSettings() {
    const st = Sumi.load();
    $('set-goal').innerHTML = Sumi.GOALS.map((g) => '<option value="' + g.v + '"' + (g.v === st.goal ? ' selected' : '') + '>' + g.label + ' – ' + g.v + '⭐ (' + g.note + ')</option>').join('');
  }
  $('set-goal').onchange = (e) => { Sumi.setGoal(Number(e.target.value)); renderAll(); };
  const EXTRA_KEYS = ['sumiKanji.testDeck', 'sumiKanji.prefs', 'sumiKanji.flashPrefs', 'sumiKanji.printPrefs', 'sumiKanji.testPrefs'];
  $('set-export').onclick = () => {
    const extra = {};
    EXTRA_KEYS.forEach((k) => { try { const v = localStorage.getItem(k); if (v) extra[k] = JSON.parse(v); } catch (e) { /* bỏ qua */ } });
    const blob = new Blob([JSON.stringify({ app: 'sumi-kanji', v: 1, at: new Date().toISOString(), progress: Sumi.load(), profile: Profile.get(), extra }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sumi-kanji-sao-luu-' + Sumi.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('set-import').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => {
      const d = JSON.parse(t);
      if (d.app !== 'sumi-kanji' || !d.progress || !d.progress.cards) throw new Error('File không phải bản sao lưu Sumi Kanji.');
      if (!confirm('Khôi phục bản sao lưu ngày ' + (d.at || '').slice(0, 10) + ' (' + Object.keys(d.progress.cards).length + ' chữ đã học)?\nTiến độ hiện tại trên máy sẽ bị thay thế.')) return;
      Sumi.replace(d.progress); Sumi.save();
      if (d.profile) localStorage.setItem('sumiKanji.profile', JSON.stringify(d.profile));
      Object.keys(d.extra || {}).forEach((k) => { if (EXTRA_KEYS.includes(k)) localStorage.setItem(k, JSON.stringify(d.extra[k])); });
      location.reload();
    }).catch((err) => alert('Không khôi phục được: ' + err.message));
    e.target.value = '';
  };
  $('set-reset').onclick = () => {
    if (!confirm('Xóa TOÀN BỘ tiến độ học, điểm số và chuỗi ngày? Không thể hoàn tác.')) return;
    if (prompt('Gõ chữ XOA để xác nhận:') !== 'XOA') return;
    Sumi.reset();
    ['sumiKanji.testDeck', 'sumiKanji.testSession'].forEach((k) => localStorage.removeItem(k));
    location.reload();
  };

  // ---------- Khởi động ----------
  function renderAll() {
    const s = computeStats();
    renderHero(s); renderStats(s); renderLevels(s); renderEvo(); renderHeat(s); renderScores(); renderBadges(s); renderStudio(); renderSettings();
  }
  renderAll();
  ['sumi:auth', 'sumi:sync', 'pageshow'].forEach((ev) => window.addEventListener(ev, renderAll));
  if (location.hash === '#avatar' || location.hash === '#evo') setTimeout(() => $(location.hash.slice(1)).scrollIntoView(), 100);
})();
