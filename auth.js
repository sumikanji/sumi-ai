// ===== Sumi Kanji — tài khoản, avatar, đồng bộ tiến độ =====
// Hai chế độ:
//  • Firebase (khi đã điền firebase-config.js và trang chạy trên http/https): Google, Apple, Email thật + đồng bộ đám mây.
//  • Trên máy (mặc định): tạo tài khoản email + mật khẩu lưu trong trình duyệt này.
(function () {
  const PROFILE_KEY = 'sumiKanji.profile';
  const SESSION_KEY = 'sumiKanji.session';
  const ACCOUNTS_KEY = 'sumiKanji.accounts';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };

  // ---------- Avatar: gà con Hiyo ----------
  const AV = {
    body: ['#FFE066', '#FFC9DE', '#B2F2BB', '#A5D8FF', '#D0BFFF', '#FFD8A8', '#F8F9FA', '#868E96'],
    bg: ['#fef9c3', '#ffedd5', '#fce7f3', '#ede9fe', '#e0f2fe', '#dcfce7', '#fee2e2', '#f5f5f4', '#fde68a', '#bfdbfe'],
    face: ['happy', 'joy', 'wink', 'cool', 'wow', 'calm', 'cheer', 'sleep'],
    acc: ['none', 'glasses', 'ribbon', 'sakura', 'leaf', 'band', 'crown', 'headphones'],
    FACE_NAME: { happy: 'Cười', joy: 'Vui sướng', wink: 'Nháy mắt', cool: 'Kính râm', wow: 'Ngạc nhiên', calm: 'Hiền', cheer: 'Mắt sao', sleep: 'Buồn ngủ' },
    ACC_NAME: { none: 'Không', glasses: 'Kính tròn', ribbon: 'Nơ hồng', sakura: 'Hoa anh đào', leaf: 'Lá non', band: 'Băng 必勝', crown: 'Vương miện', headphones: 'Tai nghe' }
  };
  const OLD_FACE = { smile: 'happy', happy: 'joy' };
  // form: 'auto' = luôn theo dạng tiến hóa hiện tại; số 0–8 = dạng đã chọn
  function resolveForm(f) { return f == null || f === 'auto' ? currentForm() : Math.min(Number(f), currentForm()); }
  function avatarSvg(av, cls) {
    av = Object.assign({ bg: AV.bg[0], face: 'happy', acc: 'none', form: 'auto' }, av || {});
    if (av.photo) return '<img class="' + (cls || 'sumi-av') + '" src="' + av.photo + '" alt="Avatar">';
    const face = AV.face.includes(av.face) ? av.face : (OLD_FACE[av.face] || 'happy');
    const tint = av.tint && av.tint !== AV.body[0] ? av.tint : null;
    const form = av.fixed != null ? av.fixed : resolveForm(av.form);
    return HIYO.svg(form, face, { cls: cls || 'sumi-av', bg: av.bg, acc: AV.acc.includes(av.acc) ? av.acc : 'none', tint });
  }
  // Bản avatar để gửi cho người khác xem (chốt dạng hiện tại, bỏ ảnh)
  function publicAvatar() {
    const a = Object.assign({}, Profile.get().avatar || {});
    delete a.photo;
    a.fixed = resolveForm(a.form);
    return a;
  }
  function randomAvatar() {
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    return { bg: r(AV.bg), face: r(['happy', 'joy', 'wink']), acc: r(['none', 'ribbon', 'sakura', 'leaf', 'glasses']), form: 'auto' };
  }

  // ---------- Hồ sơ ----------
  const Profile = {
    get() {
      const p = store.get(PROFILE_KEY, null);
      if (p) return p;
      const np = { name: '', avatar: randomAvatar(), createdAt: Date.now() };
      store.set(PROFILE_KEY, np);
      return np;
    },
    set(patch) {
      const p = Object.assign(Profile.get(), patch, { updatedAt: Date.now() });
      store.set(PROFILE_KEY, p);
      window.dispatchEvent(new CustomEvent('sumi:profile'));
      Cloud.pushProfile();
      return p;
    }
  };

  // ---------- Phiên đăng nhập ----------
  const Auth = {
    mode: 'local',
    session() { return store.get(SESSION_KEY, null); },
    isFirebase() { return Auth.mode === 'firebase'; }
  };

  async function hashPw(email, pw, salt) {
    const text = salt + '|' + email.toLowerCase() + '|' + pw;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return 'x' + h;
  }
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  const Local = {
    async signUp(name, email, pw) {
      email = email.trim().toLowerCase();
      if (!name.trim()) throw new Error('Hãy nhập tên hiển thị.');
      if (!validEmail(email)) throw new Error('Email chưa đúng định dạng.');
      if (pw.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
      const acc = store.get(ACCOUNTS_KEY, {});
      if (acc[email]) throw new Error('Email này đã có tài khoản trên máy. Hãy đăng nhập.');
      const salt = Math.random().toString(36).slice(2);
      acc[email] = { name: name.trim(), salt, hash: await hashPw(email, pw, salt), created: Date.now() };
      store.set(ACCOUNTS_KEY, acc);
      Profile.set({ name: name.trim(), email });
      store.set(SESSION_KEY, { mode: 'local', provider: 'password', email, name: name.trim(), uid: 'local:' + email });
    },
    async signIn(email, pw) {
      email = email.trim().toLowerCase();
      const acc = store.get(ACCOUNTS_KEY, {});
      const a = acc[email];
      if (!a) throw new Error('Chưa có tài khoản với email này trên máy. Hãy tạo tài khoản.');
      if (await hashPw(email, pw, a.salt) !== a.hash) throw new Error('Mật khẩu không đúng.');
      Profile.set({ email, name: Profile.get().name || a.name });
      store.set(SESSION_KEY, { mode: 'local', provider: 'password', email, name: a.name, uid: 'local:' + email });
    },
    signOut() { store.del(SESSION_KEY); }
  };

  // ---------- Firebase (đăng nhập thật + đồng bộ) ----------
  const FB_VER = '10.12.2';
  let fb = null;
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  }
  const firebaseReady = (function () {
    const cfg = window.SUMI_FIREBASE;
    if (!cfg || !/^https?:/.test(location.protocol)) return Promise.resolve(null);
    const base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    return loadScript(base + 'firebase-app-compat.js')
      .then(() => Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]))
      .then(() => {
        window.firebase.initializeApp(cfg);
        fb = window.firebase;
        Auth.mode = 'firebase';
        return new Promise((resolve) => {
          let first = true;
          fb.auth().onAuthStateChanged((u) => {
            if (u) {
              const prov = (u.providerData[0] && u.providerData[0].providerId) || 'password';
              store.set(SESSION_KEY, { mode: 'firebase', provider: prov, email: u.email || '', name: u.displayName || '', uid: u.uid });
              if (!Profile.get().name && (u.displayName || u.email)) Profile.set({ name: u.displayName || u.email.split('@')[0], email: u.email || '' });
              Cloud.pull().then(() => { renderHeader(); });
            } else if (Auth.session() && Auth.session().mode === 'firebase') {
              store.del(SESSION_KEY);
            }
            renderHeader();
            if (first) { first = false; resolve(fb); }
          });
        });
      })
      .catch((e) => { console.warn('Firebase:', e.message); return null; });
  })();

  const FB = {
    async google() { const p = new fb.auth.GoogleAuthProvider(); await popupOrRedirect(p); },
    async apple() { const p = new fb.auth.OAuthProvider('apple.com'); p.addScope('email'); p.addScope('name'); await popupOrRedirect(p); },
    async signUp(name, email, pw) {
      const c = await fb.auth().createUserWithEmailAndPassword(email.trim(), pw);
      await c.user.updateProfile({ displayName: name.trim() });
      Profile.set({ name: name.trim(), email: email.trim() });
    },
    async signIn(email, pw) { await fb.auth().signInWithEmailAndPassword(email.trim(), pw); },
    async reset(email) { await fb.auth().sendPasswordResetEmail(email.trim()); },
    async signOut() { await fb.auth().signOut(); store.del(SESSION_KEY); }
  };
  async function popupOrRedirect(provider) {
    try { await fb.auth().signInWithPopup(provider); }
    catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await fb.auth().signInWithRedirect(provider);
      else throw e;
    }
  }
  const FB_ERR = {
    'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập.',
    'auth/invalid-email': 'Email chưa đúng định dạng.',
    'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.',
    'auth/wrong-password': 'Mật khẩu không đúng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Chưa có tài khoản với email này.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Firebase (Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase Console.',
    'auth/network-request-failed': 'Không có kết nối mạng.'
  };
  const errMsg = (e) => (e && FB_ERR[e.code]) || (e && e.message) || 'Có lỗi xảy ra.';

  // Gộp tiến độ máy này với đám mây (giữ phần học nhiều hơn)
  function mergeState(a, b) {
    if (!a) return b; if (!b) return a;
    const out = Object.assign({}, a, b);
    out.cards = Object.assign({}, a.cards);
    for (const c of Object.keys(b.cards || {})) {
      const x = out.cards[c], y = b.cards[c];
      if (!x) { out.cards[c] = y; continue; }
      const nx = (x.r || 0) + (x.w || 0), ny = (y.r || 0) + (y.w || 0);
      out.cards[c] = ny > nx || (ny === nx && y.due > x.due) ? y : x;
    }
    out.days = Object.assign({}, a.days);
    for (const d of Object.keys(b.days || {})) out.days[d] = Math.max(out.days[d] || 0, b.days[d]);
    out.met = Object.assign({}, a.met, b.met);
    out.frozen = Object.assign({}, a.frozen, b.frozen);
    out.stageOk = Object.assign({}, a.stageOk, b.stageOk);
    out.gateOk = Object.assign({}, a.gateOk, b.gateOk);
    out.midOk = Object.assign({}, a.midOk, b.midOk);
    out.favs = Object.assign({}, a.favs, b.favs);
    out.stories = Object.assign({}, a.stories, b.stories);
    out.pathV = Math.max(a.pathV || 0, b.pathV || 0);
    out.best = Object.assign({}, a.best);
    for (const m of Object.keys(b.best || {})) out.best[m] = Math.max(out.best[m] || 0, b.best[m]);
    out.tests = Object.assign({}, a.tests);
    for (const k of Object.keys(b.tests || {})) {
      const x = out.tests[k], y = b.tests[k];
      out.tests[k] = !x ? y : Object.assign({}, (y.at || '') > (x.at || '') ? y : x, { best: Math.max(x.best, y.best), n: Math.max(x.n || 0, y.n || 0) });
    }
    const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
    out.goal = newer.goal; out.freezes = newer.freezes;
    out.notes = [];
    out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return out;
  }

  let pushTimer = null;
  const Cloud = {
    status: 'off',
    ref(path) { const s = Auth.session(); return fb && s && s.mode === 'firebase' ? fb.database().ref('users/' + s.uid + '/' + path) : null; },
    async pull() {
      const r = Cloud.ref('progress'); if (!r) return;
      Cloud.status = 'syncing';
      try {
        const snap = await r.once('value');
        const cloud = snap.val() ? JSON.parse(snap.val()) : null;
        const local = Sumi.load();
        const merged = mergeState(local, cloud);
        const before = JSON.stringify(local.cards) + JSON.stringify(local.days);
        Sumi.replace(merged);
        await r.set(JSON.stringify(Sumi.load()));
        const pr = await Cloud.ref('profile').once('value');
        const cp = pr.val();
        const lp = Profile.get();
        if (cp && (cp.updatedAt || 0) > (lp.updatedAt || 0)) store.set(PROFILE_KEY, cp);
        else await Cloud.ref('profile').set(lp);
        Cloud.status = 'ok'; Cloud.at = Date.now();
        if (before !== JSON.stringify(merged.cards) + JSON.stringify(merged.days) && !sessionStorage.getItem('sumiSynced')) {
          sessionStorage.setItem('sumiSynced', '1');
          location.reload();
        }
      } catch (e) { Cloud.status = 'error'; console.warn('Đồng bộ lỗi:', e.message); }
      window.dispatchEvent(new CustomEvent('sumi:sync'));
    },
    push() {
      const r = Cloud.ref('progress'); if (!r) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        r.set(JSON.stringify(Sumi.load())).then(() => { Cloud.status = 'ok'; Cloud.at = Date.now(); window.dispatchEvent(new CustomEvent('sumi:sync')); })
          .catch(() => { Cloud.status = 'error'; });
      }, 1500);
    },
    pushProfile() { const r = Cloud.ref('profile'); if (r) r.set(Profile.get()).catch(() => {}); }
  };
  window.addEventListener('sumi:saved', () => Cloud.push());

  // ---------- Giao diện: nút trên header ----------
  function displayName() {
    const p = Profile.get(), s = Auth.session();
    return p.name || (s && (s.name || (s.email || '').split('@')[0])) || 'Khách';
  }
  function renderHeader() {
    const slot = document.querySelector('.nav-right');
    if (!slot) return;
    let box = document.getElementById('acct-box');
    if (!box) {
      slot.querySelectorAll('.profile-pill').forEach((x) => x.remove());
      box = document.createElement('div');
      box.id = 'acct-box';
      box.className = 'acct-box';
      slot.appendChild(box);
    }
    renderLevelChip(slot);
    const s = Auth.session();
    if (!s) {
      box.innerHTML = '<button class="acct-login" id="acct-login"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg><span>Đăng nhập</span></button>';
      box.querySelector('#acct-login').onclick = () => openLogin('signin');
      return;
    }
    const p = Profile.get();
    box.innerHTML = '<button class="acct-me" id="acct-me" aria-haspopup="true">' + avatarSvg(p.avatar, 'acct-av') + '<span>' + esc(displayName()) + '</span><i>▾</i></button>' +
      '<div class="acct-menu" id="acct-menu" hidden>' +
      '<div class="am-head">' + avatarSvg(p.avatar, 'am-av') + '<div><b>' + esc(displayName()) + '</b><small>' + esc(s.email || '') + '</small><em>' + providerLabel(s) + '</em></div></div>' +
      '<a href="profile.html">👤 Trang cá nhân</a><a href="profile.html#avatar">🎨 Đổi avatar</a><a href="rank.html">🏆 Bảng xếp hạng</a>' +
      '<button id="acct-out">↩ Đăng xuất</button></div>';
    const menu = box.querySelector('#acct-menu');
    box.querySelector('#acct-me').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      document.addEventListener('click', (e) => { const m = document.getElementById('acct-menu'); if (m && !box.contains(e.target)) m.hidden = true; });
    }
    box.querySelector('#acct-out').onclick = () => signOut();
  }
  // Huy hiệu cấp – màn trên đầu trang
  function renderLevelChip(slot) {
    if (!window.SumiPath) return;
    let chip = document.getElementById('lv-chip');
    if (!chip) {
      chip = document.createElement('a');
      chip.id = 'lv-chip';
      chip.className = 'lv-chip';
      slot.insertBefore(chip, document.getElementById('acct-box'));
    }
    const r = SumiPath.rank();
    const C = 2 * Math.PI * 21;
    chip.href = r.level ? 'level.html?id=' + r.level : 'profile.html#evo';
    chip.title = r.level ? 'Đang ở ' + SumiPath.short(r.level) + (r.boss ? ' · thi tổng hợp' : r.mid ? ' · kiểm tra giữa cấp' : ' · màn ' + r.stage + '/' + r.stages) : 'Đã học hết 2.136 chữ!';
    chip.innerHTML = '<span class="lc-av"><svg class="lc-ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" class="lc-bg"/><circle cx="24" cy="24" r="21" class="lc-fg" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - r.pct)).toFixed(1) + '"/></svg>' +
      HIYO.svg(r.form, r.form === 0 ? 'sleep' : 'happy', { cls: 'lc-hiyo' }) + '</span><span class="lc-txt"><b>Lv ' + r.label + '</b><small>' + esc(r.name) + '</small></span>';
  }

  function providerLabel(s) {
    if (!s) return 'Chưa đăng nhập';
    const m = { 'google.com': 'Google', 'apple.com': 'Apple ID', password: 'Email' };
    return (m[s.provider] || 'Email') + (s.mode === 'firebase' ? ' · đồng bộ đám mây' : ' · tài khoản trên máy');
  }
  async function signOut() {
    if (!confirm('Đăng xuất khỏi tài khoản?' + (Auth.isFirebase() ? '' : '\n(Tiến độ học vẫn được giữ trên máy này.)'))) return;
    if (Auth.isFirebase() && fb) await FB.signOut(); else Local.signOut();
    sessionStorage.removeItem('sumiSynced');
    renderHeader();
    window.dispatchEvent(new CustomEvent('sumi:auth'));
  }

  // ---------- Hộp thoại đăng nhập ----------
  const G_ICON = '<svg viewBox="0 0 48 48" width="20" height="20"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const A_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.37 12.6c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.95-3.94.95-.82 0-2.07-.93-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.81 1.3 10.37.87 1.25 1.9 2.65 3.25 2.6 1.31-.05 1.8-.84 3.38-.84 1.58 0 2.02.84 3.4.81 1.41-.02 2.3-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.15zM13.78 4.97c.72-.88 1.21-2.09 1.08-3.3-1.04.04-2.3.69-3.04 1.57-.67.77-1.25 2.01-1.1 3.2 1.16.09 2.35-.59 3.06-1.47z"/></svg>';
  let modal = null;
  function openLogin(tab) {
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'login-overlay';
      modal.innerHTML = '<div class="login-card" role="dialog" aria-modal="true" aria-labelledby="lg-title">' +
        '<button class="lg-close" aria-label="Đóng">✕</button>' +
        '<div class="lg-mascot">' + avatarSvg({ bg: '#fef9c3', face: 'joy', fixed: 2 }, 'lg-av') + '</div>' +
        '<h2 id="lg-title">Chào mừng đến Sumi Kanji!</h2>' +
        '<p class="lg-sub">Đăng nhập để lưu tiến độ, điểm số và avatar của bạn.</p>' +
        '<div class="lg-providers">' +
        (window.SUMI_AUTH_PROVIDERS.google !== false ? '<button class="lg-btn g" data-p="google">' + G_ICON + '<span>Tiếp tục với Google (Gmail)</span></button>' : '') +
        (window.SUMI_AUTH_PROVIDERS.apple !== false ? '<button class="lg-btn a" data-p="apple">' + A_ICON + '<span>Tiếp tục với Apple ID</span></button>' : '') +
        '</div><div class="lg-or"><span>hoặc dùng email</span></div>' +
        '<div class="lg-tabs"><button data-t="signin">Đăng nhập</button><button data-t="signup">Tạo tài khoản</button></div>' +
        '<form class="lg-form" novalidate>' +
        '<label class="lg-name">Tên hiển thị<input name="name" autocomplete="nickname" maxlength="30" placeholder="vd: Minh Anh"></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" placeholder="ban@gmail.com"></label>' +
        '<label>Mật khẩu<input name="pw" type="password" autocomplete="current-password" placeholder="Ít nhất 6 ký tự"></label>' +
        '<label class="lg-pw2">Nhập lại mật khẩu<input name="pw2" type="password" autocomplete="new-password"></label>' +
        '<p class="lg-err" role="alert"></p>' +
        '<button class="lg-submit" type="submit"></button>' +
        '<button class="lg-forgot" type="button">Quên mật khẩu?</button>' +
        '</form><p class="lg-note"></p></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.lg-close')) closeLogin(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) closeLogin(); });
      modal.querySelectorAll('.lg-tabs button').forEach((b) => { b.onclick = () => setTab(b.dataset.t); });
      modal.querySelectorAll('.lg-btn').forEach((b) => { b.onclick = () => providerLogin(b.dataset.p); });
      modal.querySelector('.lg-form').addEventListener('submit', (e) => { e.preventDefault(); emailSubmit(); });
      modal.querySelector('.lg-forgot').onclick = forgot;
    }
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    setTab(tab || 'signin');
    firebaseReady.then(() => {
      modal.querySelector('.lg-note').innerHTML = Auth.isFirebase()
        ? '🔒 Đăng nhập an toàn qua Firebase. Tiến độ được đồng bộ giữa các thiết bị.'
        : '💾 Chế độ <b>tài khoản trên máy</b>: tài khoản email lưu trong trình duyệt này. Đăng nhập Google / Apple và đồng bộ nhiều máy cần cấu hình Firebase (xem HUONG-DAN-DANG-NHAP.md).';
    });
  }
  function closeLogin() { if (modal) { modal.hidden = true; document.body.classList.remove('no-scroll'); } }
  let tabNow = 'signin';
  function setTab(t) {
    tabNow = t;
    modal.querySelectorAll('.lg-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    modal.querySelector('.lg-name').hidden = t !== 'signup';
    modal.querySelector('.lg-pw2').hidden = t !== 'signup';
    modal.querySelector('.lg-forgot').hidden = t !== 'signin';
    modal.querySelector('.lg-submit').textContent = t === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập';
    modal.querySelector('[name=pw]').autocomplete = t === 'signup' ? 'new-password' : 'current-password';
    showErr('');
  }
  function showErr(m, ok) { const el = modal.querySelector('.lg-err'); el.textContent = m; el.classList.toggle('ok', !!ok); }
  function busy(on) { modal.querySelectorAll('button, input').forEach((x) => { x.disabled = on; }); }
  async function done() {
    closeLogin();
    renderHeader();
    window.dispatchEvent(new CustomEvent('sumi:auth'));
    if (typeof window.sumiCelebrate === 'function') {
      window.sumiCelebrate({ title: 'Xin chào, ' + esc(displayName()) + '!', sub: 'Bạn đã đăng nhập. Vào <b>Trang cá nhân</b> để tạo avatar nhé.', mascot: 'cheer', button: 'Tuyệt!' });
    }
  }
  async function providerLogin(p) {
    await firebaseReady;
    if (!Auth.isFirebase()) {
      showErr((p === 'google' ? 'Đăng nhập Google' : 'Đăng nhập Apple ID') + ' cần cấu hình Firebase và mở trang qua địa chỉ web (http/https). Hiện tại bạn có thể tạo tài khoản bằng email bên dưới.');
      return;
    }
    busy(true); showErr('');
    try { await (p === 'google' ? FB.google() : FB.apple()); await done(); }
    catch (e) { showErr(errMsg(e)); }
    finally { busy(false); }
  }
  async function emailSubmit() {
    const f = modal.querySelector('.lg-form');
    const name = f.name.value, email = f.email.value, pw = f.pw.value;
    if (tabNow === 'signup' && pw !== f.pw2.value) return showErr('Hai mật khẩu chưa giống nhau.');
    if (!validEmail(email.trim())) return showErr('Email chưa đúng định dạng.');
    busy(true); showErr('');
    try {
      await firebaseReady;
      if (Auth.isFirebase()) {
        if (tabNow === 'signup') { if (!name.trim()) throw new Error('Hãy nhập tên hiển thị.'); await FB.signUp(name, email, pw); }
        else await FB.signIn(email, pw);
      } else if (tabNow === 'signup') await Local.signUp(name, email, pw);
      else await Local.signIn(email, pw);
      f.reset();
      await done();
    } catch (e) { showErr(errMsg(e)); }
    finally { busy(false); }
  }
  async function forgot() {
    const email = modal.querySelector('[name=email]').value;
    await firebaseReady;
    if (!Auth.isFirebase()) return showErr('Tài khoản trên máy không gửi được email đặt lại mật khẩu. Bạn có thể tạo tài khoản mới — tiến độ học vẫn còn trên máy.');
    if (!validEmail(email.trim())) return showErr('Nhập email của bạn vào ô Email trước.');
    try { await FB.reset(email); showErr('Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư.', true); }
    catch (e) { showErr(errMsg(e)); }
  }

  // ---------- Xuất ra ngoài ----------
  window.SumiAccount = { Profile, Auth, Cloud, AV, avatarSvg, publicAvatar, resolveForm, renderLevelChip, randomAvatar, openLogin, signOut, displayName, providerLabel, firebaseReady, renderHeader, getFb: () => fb };
  window.sumiAvatarSvg = avatarSvg;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderHeader); else renderHeader();
  window.addEventListener('sumi:profile', renderHeader);
  window.addEventListener('sumi:saved', () => { const sl = document.querySelector('.nav-right'); if (sl) renderLevelChip(sl); });
  window.addEventListener('storage', (e) => { if (e.key === SESSION_KEY || e.key === PROFILE_KEY) renderHeader(); });
})();
