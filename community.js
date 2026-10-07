// ===== Sumi Kanji — cộng đồng: góp ý mẹo nhớ cho từng chữ & bảng xếp hạng =====
// • Firebase đã cấu hình: góp ý và xếp hạng dùng chung cho mọi thành viên (Realtime Database).
// • Chưa cấu hình: lưu trên trình duyệt này (chỉ thấy góp ý / tài khoản trên máy này).
(function () {
  const A = window.SumiAccount;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const TIPS_KEY = 'sumiKanji.tips';
  const LB_KEY = 'sumiKanji.leaderboard';
  const MAX_LEN = 400;
  const HIDE_REPORTS = 3;
  const KINDS = { meo: ['💡', 'Mẹo nhớ'], hoc: ['📖', 'Cách học'], luu: ['⚠️', 'Lưu ý dễ sai'], vd: ['✍️', 'Ví dụ hay'] };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  };

  const ready = A.firebaseReady.then((fb) => (fb ? 'cloud' : 'local'));
  const db = () => A.getFb().database();
  const me = () => { const s = A.Auth.session(); return s ? s.uid : null; };
  const myAvatar = () => A.publicAvatar();

  // ---------- Thống kê để xếp hạng ----------
  function stats() {
    const st = Sumi.load();
    const t = Sumi.today();
    let week = 0, xp = 0;
    for (const d of Object.keys(st.days)) {
      xp += st.days[d];
      if (Sumi.diffDays(d, t) < 7 && Sumi.diffDays(d, t) >= 0) week += st.days[d];
    }
    const okDays = Object.keys(Object.assign({}, st.met, st.frozen)).sort();
    let longest = 0, run = 0, prev = null;
    okDays.forEach((d) => { run = prev && Sumi.diffDays(prev, d) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
    const tests = st.tests || {};
    const PASS = { k10: 120, k9: 120, k8: 120, k2: 160 };
    const kk = new Set(Object.keys(tests).filter((k) => k.startsWith('kanken:') && tests[k].best >= (PASS[k.split(':')[1]] || 140)).map((k) => k.split(':')[1]));
    const r = window.SumiPath ? SumiPath.rank() : null;
    return { learned: Object.keys(st.cards).length, xp, week, weekOf: t, streak: Sumi.streakInfo().count, longest, kk: kk.size, lv: r ? r.label : '', form: r ? r.form : 2 };
  }

  // ---------- Góp ý ----------
  const Tips = {
    async list(k) {
      if (await ready === 'cloud') {
        const snap = await db().ref('tips').orderByChild('k').equalTo(k).once('value');
        const out = []; snap.forEach((c) => { out.push(Object.assign({ id: c.key }, c.val())); });
        return out;
      }
      return store.get(TIPS_KEY, []).filter((x) => x.k === k);
    },
    async recent(n) {
      if (await ready === 'cloud') {
        const snap = await db().ref('tips').orderByChild('at').limitToLast(n * 2).once('value');
        const out = []; snap.forEach((c) => { out.push(Object.assign({ id: c.key }, c.val())); });
        return out.filter(visible).sort((a, b) => b.at - a.at).slice(0, n);
      }
      return store.get(TIPS_KEY, []).filter(visible).sort((a, b) => b.at - a.at).slice(0, n);
    },
    async add(k, text, kind) {
      const s = A.Auth.session();
      if (!s) throw new Error('Hãy đăng nhập để góp ý.');
      text = text.trim().replace(/\s+\n/g, '\n');
      if (text.length < 5) throw new Error('Góp ý hơi ngắn, hãy viết rõ hơn một chút nhé.');
      if (text.length > MAX_LEN) throw new Error('Góp ý tối đa ' + MAX_LEN + ' ký tự.');
      const tip = { k, text, kind: KINDS[kind] ? kind : 'meo', uid: s.uid, name: A.displayName(), avatar: myAvatar(), at: Date.now() };
      if (await ready === 'cloud') {
        tip.at = A.getFb().database.ServerValue.TIMESTAMP;
        await db().ref('tips').push(tip);
      } else {
        const all = store.get(TIPS_KEY, []);
        all.push(Object.assign({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, tip));
        store.set(TIPS_KEY, all);
      }
    },
    async remove(id) {
      if (await ready === 'cloud') return db().ref('tips/' + id).remove();
      store.set(TIPS_KEY, store.get(TIPS_KEY, []).filter((x) => x.id !== id));
    },
    async toggle(id, field) { // field: likes | reports
      const u = me(); if (!u) throw new Error('Hãy đăng nhập trước.');
      if (await ready === 'cloud') {
        const r = db().ref('tips/' + id + '/' + field + '/' + u);
        const v = (await r.once('value')).val();
        return v ? r.remove() : r.set(true);
      }
      const all = store.get(TIPS_KEY, []);
      const t = all.find((x) => x.id === id); if (!t) return;
      t[field] = t[field] || {};
      if (t[field][u]) delete t[field][u]; else t[field][u] = true;
      store.set(TIPS_KEY, all);
    }
  };
  const count = (o) => Object.keys(o || {}).length;
  const visible = (t) => count(t.reports) < HIDE_REPORTS;

  // ---------- Bảng xếp hạng ----------
  const Board = {
    async publish() {
      const s = A.Auth.session(); if (!s) return;
      const p = A.Profile.get();
      const pa = A.publicAvatar();
      if (p.avatar && p.avatar.photo) pa.photo = p.avatar.photo;
      const entry = Object.assign({ uid: s.uid, name: A.displayName(), avatar: pa, at: Date.now() }, stats());
      if (await ready === 'cloud') { try { await db().ref('leaderboard/' + s.uid).set(entry); } catch (e) { /* bỏ qua */ } }
      else { const lb = store.get(LB_KEY, {}); lb[s.uid] = entry; store.set(LB_KEY, lb); }
    },
    async list() {
      let rows;
      if (await ready === 'cloud') {
        const snap = await db().ref('leaderboard').orderByChild('xp').limitToLast(200).once('value');
        rows = []; snap.forEach((c) => { rows.push(c.val()); });
      } else rows = Object.values(store.get(LB_KEY, {}));
      const t = Sumi.today();
      rows.forEach((r) => { if (!r.weekOf || Sumi.diffDays(r.weekOf, t) >= 7) r.week = 0; });
      return rows;
    }
  };
  let pubTimer = null;
  const schedulePublish = () => { clearTimeout(pubTimer); pubTimer = setTimeout(() => Board.publish(), 2500); };
  window.addEventListener('sumi:saved', schedulePublish);
  window.addEventListener('sumi:auth', () => Board.publish());
  window.addEventListener('sumi:profile', schedulePublish);
  ready.then(() => { if (A.Auth.session()) schedulePublish(); });

  // ---------- Giao diện chung ----------
  function ago(ts) {
    const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.round(s / 60) + ' phút trước';
    if (s < 86400) return Math.round(s / 3600) + ' giờ trước';
    if (s < 86400 * 30) return Math.round(s / 86400) + ' ngày trước';
    return new Date(ts).toLocaleDateString('vi-VN');
  }
  const modeNote = (mode) => mode === 'cloud' ? '' : '<p class="cm-local">💾 Đang ở chế độ trên máy: chỉ thấy góp ý và thành viên trên trình duyệt này. Bật Firebase (xem HUONG-DAN-DANG-NHAP.md) để dùng chung với mọi người.</p>';

  function tipHtml(t, opts) {
    const u = me();
    const liked = !!(t.likes && u && t.likes[u]);
    const reported = !!(t.reports && u && t.reports[u]);
    const kind = KINDS[t.kind] || KINDS.meo;
    const k = opts && opts.showKanji && window.SUMI_INDEX && window.SUMI_INDEX[t.k];
    return '<li class="cm-tip" data-id="' + esc(t.id) + '">' +
      (opts && opts.showKanji ? '<a class="cm-k" href="' + kanjiLink(t.k) + '"><b>' + esc(t.k) + '</b>' + (k ? '<small>' + esc(k[0].startsWith('(') ? '' : k[0]) + '</small>' : '') + '</a>' : '') +
      '<div class="cm-main"><div class="cm-head">' + A.avatarSvg(t.avatar, 'cm-av') + '<b>' + esc(t.name || 'Thành viên') + '</b>' +
      '<span class="cm-kind">' + kind[0] + ' ' + kind[1] + '</span><span class="cm-time">' + ago(t.at || Date.now()) + '</span></div>' +
      '<p class="cm-text">' + esc(t.text).replace(/\n/g, '<br>') + '</p>' +
      '<div class="cm-acts"><button class="cm-like' + (liked ? ' on' : '') + '" data-act="like">👍 Hữu ích <span>' + count(t.likes) + '</span></button>' +
      (u && t.uid === u ? '<button data-act="del">🗑 Xóa</button>' : (u ? '<button data-act="report"' + (reported ? ' class="on"' : '') + '>' + (reported ? '🚩 Đã báo cáo' : '🚩 Báo cáo') + '</button>' : '')) +
      '</div></div></li>';
  }
  function kanjiLink(k) {
    const lv = typeof gradeLevelOf === 'function' ? gradeLevelOf(k) : null;
    return lv ? 'level.html?id=' + lv + '&k=' + encodeURIComponent(k) : 'dict.html#' + encodeURIComponent(k);
  }
  function bindActions(root, refresh) {
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const li = b.closest('.cm-tip'); const id = li && li.dataset.id;
      if (!A.Auth.session()) { A.openLogin('signin'); return; }
      try {
        if (b.dataset.act === 'like') await Tips.toggle(id, 'likes');
        else if (b.dataset.act === 'report') { if (!b.classList.contains('on') && !confirm('Báo cáo góp ý này là không phù hợp?')) return; await Tips.toggle(id, 'reports'); }
        else if (b.dataset.act === 'del') { if (!confirm('Xóa góp ý của bạn?')) return; await Tips.remove(id); }
        refresh();
      } catch (err) { alert(err.message); }
    });
  }

  // Vẽ lại khi đăng nhập / đăng xuất / đổi avatar
  const MOUNTED = new Set();
  ['sumi:auth', 'sumi:profile'].forEach((ev) => window.addEventListener(ev, () => MOUNTED.forEach((el) => el._draw && el._draw())));

  // Khung góp ý dưới mỗi chữ
  function mountKanji(el, k) {
    el.dataset.k = k;
    const draw = async () => {
      if (el.dataset.k !== k) return;
      const mode = await ready;
      let tips = [];
      try { tips = (await Tips.list(k)).filter(visible); } catch (e) { el.querySelector('.cm-list').innerHTML = '<li class="cm-empty">Không tải được góp ý: ' + esc(e.message) + '</li>'; return; }
      if (el.dataset.k !== k) return;
      tips.sort((a, b) => count(b.likes) - count(a.likes) || b.at - a.at);
      el.querySelector('.cm-count').textContent = tips.length ? tips.length + ' góp ý' : '';
      el.querySelector('.cm-list').innerHTML = tips.length ? tips.map((t) => tipHtml(t)).join('')
        : '<li class="cm-empty">Chưa có góp ý nào cho 「' + esc(k) + '」. Hãy là người đầu tiên chia sẻ cách bạn nhớ chữ này! ✨</li>';
      el.querySelector('.cm-mode').innerHTML = modeNote(mode);
      const s = A.Auth.session();
      el.querySelector('.cm-form').hidden = !s;
      el.querySelector('.cm-login').hidden = !!s;
      if (s) el.querySelector('.cm-me').innerHTML = A.avatarSvg(A.Profile.get().avatar, 'cm-av') + '<b>' + esc(A.displayName()) + '</b>';
    };
    el.innerHTML = '<div class="cm-title"><span>💬 Góp ý cách học & mẹo nhớ</span><small class="cm-count"></small></div>' +
      '<p class="cm-sub">Bạn nhớ chữ này bằng cách nào? Chia sẻ mẹo nhớ, cách học hay lỗi hay nhầm để giúp các bạn khác.</p>' +
      '<form class="cm-form" hidden><div class="cm-me"></div>' +
      '<div class="cm-kinds">' + Object.keys(KINDS).map((x, i) => '<label><input type="radio" name="kind" value="' + x + '"' + (i ? '' : ' checked') + '><span>' + KINDS[x][0] + ' ' + KINDS[x][1] + '</span></label>').join('') + '</div>' +
      '<textarea name="text" maxlength="' + MAX_LEN + '" rows="3" placeholder="Ví dụ: 休 = người (亻) dựa gốc cây (木) để nghỉ → nghỉ ngơi."></textarea>' +
      '<div class="cm-form-foot"><small class="cm-len">0/' + MAX_LEN + '</small><span class="cm-err"></span><button type="submit">Gửi góp ý</button></div></form>' +
      '<button class="cm-login" type="button" hidden>🔑 Đăng nhập để góp ý</button>' +
      '<ul class="cm-list"><li class="cm-empty">Đang tải…</li></ul><div class="cm-mode"></div>';
    const f = el.querySelector('.cm-form');
    f.text.addEventListener('input', () => { el.querySelector('.cm-len').textContent = f.text.value.length + '/' + MAX_LEN; });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button'); btn.disabled = true;
      el.querySelector('.cm-err').textContent = '';
      try {
        await Tips.add(k, f.text.value, f.kind.value);
        f.text.value = ''; el.querySelector('.cm-len').textContent = '0/' + MAX_LEN;
        await draw();
        const list = el.querySelector('.cm-list'); if (list.firstElementChild) list.firstElementChild.classList.add('cm-new');
      } catch (err) { el.querySelector('.cm-err').textContent = err.message; }
      btn.disabled = false;
    });
    el.querySelector('.cm-login').onclick = () => A.openLogin('signin');
    if (!el.dataset.bound) { el.dataset.bound = '1'; bindActions(el, () => el._draw && el._draw()); }
    el._draw = draw;
    MOUNTED.add(el);
    draw();
  }

  // Góp ý mới nhất (trang chủ)
  async function mountRecent(el, n) {
    const draw = async () => {
      const mode = await ready;
      let tips = [];
      try { tips = await Tips.recent(n); } catch (e) { /* bỏ qua */ }
      el.innerHTML = (tips.length ? '<ul class="cm-list cm-wall">' + tips.map((t) => tipHtml(t, { showKanji: true })).join('') + '</ul>'
        : '<p class="cm-empty big">Chưa có góp ý nào. Mở một chữ bất kỳ và chia sẻ mẹo nhớ của bạn ở cuối trang học nhé! ✨</p>') + modeNote(mode);
    };
    if (!el.dataset.bound) { el.dataset.bound = '1'; bindActions(el, draw); window.addEventListener('sumi:auth', draw); }
    await draw();
  }

  // Bảng xếp hạng
  const METRICS = {
    week: ['⭐ Điểm tuần này', (r) => r.week || 0, '⭐'],
    xp: ['🌟 Tổng điểm', (r) => r.xp || 0, '⭐'],
    learned: ['📖 Chữ đã học', (r) => r.learned || 0, ' chữ'],
    streak: ['🔥 Chuỗi ngày', (r) => r.streak || 0, ' ngày']
  };
  async function mountBoard(el, opts) {
    opts = Object.assign({ limit: 10, metric: 'week' }, opts || {});
    let metric = opts.metric;
    let rows = [];
    const draw = () => {
      const [, val, unit] = METRICS[metric];
      const sorted = rows.filter((r) => val(r) > 0 || metric === 'learned').sort((a, b) => val(b) - val(a) || (b.xp || 0) - (a.xp || 0));
      const u = me();
      const myIdx = sorted.findIndex((r) => r.uid === u);
      const top = sorted.slice(0, opts.limit);
      const podium = top.slice(0, 3);
      const order = [1, 0, 2].filter((i) => podium[i]);
      let h = '<div class="lb-tabs">' + Object.keys(METRICS).map((m) => '<button data-m="' + m + '" class="' + (m === metric ? 'on' : '') + '">' + METRICS[m][0] + '</button>').join('') + '</div>';
      if (!sorted.length) {
        h += '<p class="cm-empty big">Chưa có ai trên bảng xếp hạng. Đăng nhập và học vài chữ để ghi tên mình đầu tiên! 🏁</p>';
      } else {
        h += '<div class="lb-podium">' + order.map((i) => {
          const r = podium[i];
          return '<div class="lb-p p' + (i + 1) + (r.uid === u ? ' me' : '') + '"><span class="lb-medal">' + ['🥇', '🥈', '🥉'][i] + '</span>' + A.avatarSvg(r.avatar, 'lb-pav') +
            '<b>' + esc(r.name) + '</b>' + (r.lv ? '<em class="lb-lv">Lv ' + esc(r.lv) + '</em>' : '') + '<span class="lb-v">' + val(r).toLocaleString('vi-VN') + unit + '</span><div class="lb-stand">' + (i + 1) + '</div></div>';
        }).join('') + '</div>';
        const rest = top.slice(3);
        h += '<ol class="lb-list" start="4">' + rest.map((r, i) => rowHtml(r, i + 4, val, unit, u)).join('') + '</ol>';
        if (myIdx >= opts.limit) h += '<ol class="lb-list lb-mine" start="' + (myIdx + 1) + '">' + rowHtml(sorted[myIdx], myIdx + 1, val, unit, u) + '</ol>';
      }
      if (!u) h += '<p class="lb-join">👤 Bạn chưa có tên trên bảng. <button class="lb-login">Đăng nhập</button> để tham gia xếp hạng.</p>';
      h += modeNote(window.__sumiMode);
      el.innerHTML = h;
      el.querySelectorAll('.lb-tabs button').forEach((b) => { b.onclick = () => { metric = b.dataset.m; draw(); }; });
      const lg = el.querySelector('.lb-login'); if (lg) lg.onclick = () => A.openLogin('signin');
    };
    const load = async () => {
      window.__sumiMode = await ready;
      if (A.Auth.session()) await Board.publish();
      try { rows = await Board.list(); } catch (e) { rows = []; }
      draw();
    };
    window.addEventListener('sumi:auth', load);
    await load();
  }
  function rowHtml(r, rank, val, unit, u) {
    return '<li class="' + (r.uid === u ? 'me' : '') + '" value="' + rank + '"><span class="lb-rank">' + rank + '</span>' + A.avatarSvg(r.avatar, 'lb-av') +
      '<span class="lb-name"><b>' + esc(r.name) + (r.uid === u ? ' <em>(bạn)</em>' : '') + (r.lv ? ' <i class="lb-lv">Lv ' + esc(r.lv) + '</i>' : '') + '</b><small>📖 ' + (r.learned || 0) + ' chữ · 🔥 ' + (r.streak || 0) + ' ngày' + (r.kk ? ' · 🎌 ' + r.kk + ' cấp đỗ' : '') + '</small></span>' +
      '<span class="lb-val">' + val(r).toLocaleString('vi-VN') + unit + '</span></li>';
  }

  window.SumiCommunity = { Tips, Board, ready, mountKanji, mountRecent, mountBoard, stats };
})();
