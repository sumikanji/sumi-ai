// ===== Trang bảng xếp hạng =====
(function () {
  const A = window.SumiAccount;
  function me() {
    const box = document.getElementById('rank-me');
    const s = SumiCommunity.stats();
    const sess = A.Auth.session();
    box.innerHTML = A.avatarSvg(A.Profile.get().avatar, 'rm-av') +
      '<div><b>' + sumiEsc(sess ? A.displayName() : 'Khách') + '</b><small>⭐ ' + s.week.toLocaleString('vi-VN') + ' tuần này · 📖 ' + s.learned + ' chữ · 🔥 ' + s.streak + ' ngày</small>' +
      (sess ? '<a href="profile.html">Trang cá nhân →</a>' : '<button id="rm-login">Đăng nhập để xếp hạng</button>') + '</div>';
    const b = document.getElementById('rm-login'); if (b) b.onclick = () => A.openLogin('signin');
  }
  me();
  window.addEventListener('sumi:auth', me);
  window.addEventListener('sumi:profile', me);
  SumiCommunity.mountBoard(document.getElementById('rank-board'), { limit: 50, metric: new URLSearchParams(location.search).get('m') || 'week' });
  SumiCommunity.mountRecent(document.getElementById('rank-tips'), 20);
})();
