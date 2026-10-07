/*! © 2026 Sumi Kanji — All rights reserved. Nhân vật Hiyo, giao diện, mã nguồn và nội dung biên soạn thuộc Sumi Kanji. */
// ===== Bản quyền & chống sao chép =====
// 1) Chân trang © + liên kết Điều khoản  2) Kiểm tra tên miền (khi đã đưa lên mạng)
// 3) Gắn nguồn khi sao chép đoạn dài  4) Chặn kéo/lưu hình linh vật  5) Dấu nhận dạng ẩn
(function () {
  // ---------- CẤU HÌNH: sửa khi đưa web lên mạng ----------
  const SITE = window.SUMI_SITE = Object.assign({
    name: 'Sumi Kanji',
    owner: 'Sumi Kanji',
    since: 2026,
    home: '',            // ví dụ 'https://sumikanji.com'
    domains: [],         // ví dụ ['sumikanji.com', 'www.sumikanji.com', 'sumi-kanji.web.app']
    contact: ''          // ví dụ 'lienhe@sumikanji.com'
  }, window.SUMI_SITE || {});
  // Dấu nhận dạng: nếu thấy chuỗi này trên trang khác → bằng chứng sao chép mã của bạn
  SITE.sig = 'SK-7f3a9c-HIYO-2026';

  const year = new Date().getFullYear();
  const years = year > SITE.since ? SITE.since + '–' + year : String(SITE.since);
  const online = /^https?:$/.test(location.protocol);
  const host = location.hostname;
  const local = !online || host === 'localhost' || host === '127.0.0.1' || /\.local$/.test(host);

  // ---------- 1) Chân trang ----------
  function footer() {
    if (document.querySelector('.sumi-footer')) return;
    const f = document.createElement('footer');
    f.className = 'sumi-footer';
    f.setAttribute('data-sig', SITE.sig);
    f.innerHTML =
      '<div class="sf-inner">' +
        '<div class="sf-brand"><b>' + SITE.name + '</b><span>笑って 楽しくマスター！</span></div>' +
        '<nav class="sf-links"><a href="route.html">Hướng dẫn lộ trình</a><a href="terms.html">Điều khoản sử dụng</a><a href="terms.html#ban-quyen">Bản quyền</a><a href="terms.html#nguon">Nguồn dữ liệu</a>' +
          (SITE.contact ? '<a href="mailto:' + SITE.contact + '">Liên hệ</a>' : '') + '</nav>' +
        '<p class="sf-copy">© ' + years + ' ' + SITE.owner + '. Bảo lưu mọi quyền. Nhân vật <b>Hiyo</b> (ひよ) và các dạng tiến hóa là tài sản của ' + SITE.owner + '.<br>' +
          'Không sao chép, đăng lại hoặc sử dụng hình ảnh, giao diện, mã nguồn khi chưa được phép.</p>' +
        '<p class="sf-src">Dữ liệu nét chữ: KanjiVG (CC BY-SA 3.0) · Từ điển: JMdict/KANJIDIC – EDRDG (CC BY-SA 4.0)</p>' +
      '</div>';
    document.body.appendChild(f);
  }

  // ---------- 2) Kiểm tra tên miền ----------
  function domainGuard() {
    if (local || !SITE.domains.length) return;
    const ok = SITE.domains.some((d) => host === d || host.endsWith('.' + d));
    if (ok) return;
    const b = document.createElement('div');
    b.className = 'sumi-pirate';
    b.innerHTML = '⚠️ Đây là <b>bản sao trái phép</b> của ' + SITE.name + '. ' +
      (SITE.home ? 'Trang chính thức: <a href="' + SITE.home + '">' + SITE.home.replace(/^https?:\/\//, '') + '</a>' : '');
    document.body.prepend(b);
    document.documentElement.classList.add('is-pirate');
  }

  // ---------- 3) Gắn nguồn khi sao chép đoạn dài ----------
  function copyCredit(e) {
    const sel = String(window.getSelection() || '');
    if (sel.length < 200 || !e.clipboardData) return; // sao chép chữ, từ, câu ví dụ → để yên
    const src = (SITE.home || location.href).split('#')[0];
    e.clipboardData.setData('text/plain', sel + '\n\n— Nguồn: ' + SITE.name + ' · ' + src + ' · © ' + SITE.owner);
    e.preventDefault();
  }

  // ---------- 4) Bảo vệ hình linh vật ----------
  // Hình Hiyo luôn có khung viewBox riêng → nhận ra mà không chặn các icon khác
  const MASCOT = 'svg[viewBox="-72 -66 144 132"], svg[viewBox="-74 -74 148 148"]';
  function guardMascot(e) {
    if (e.target.closest && e.target.closest(MASCOT)) e.preventDefault();
  }

  // ---------- 5) Thông báo trong console ----------
  function consoleNote() {
    try {
      console.log('%c' + SITE.name + '%c\n© ' + years + ' ' + SITE.owner + ' — mã nguồn & nhân vật Hiyo được bảo hộ bản quyền.\nVui lòng không sao chép. ' + SITE.sig,
        'font:900 20px sans-serif;color:#E0A800', 'font:12px sans-serif;color:#666');
    } catch (e) {}
  }


  // ---------- Giao diện chân trang ----------
  const CSS = '.sumi-footer{margin-top:56px;padding:28px 16px 34px;background:#2f2a26;color:#d6cfc7;font-size:13px;line-height:1.6}' +
    '.sf-inner{max-width:1100px;margin:0 auto;display:grid;gap:8px}' +
    '.sf-brand{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.sf-brand b{color:#FFD43B;font-size:17px}.sf-brand span{color:#a8a29e}' +
    '.sf-links{display:flex;gap:16px;flex-wrap:wrap}.sf-links a{color:#fff;text-decoration:none;font-weight:600}.sf-links a:hover{color:#FFD43B}' +
    '.sf-copy{margin:4px 0 0}.sf-copy b{color:#FFE066}.sf-src{margin:0;color:#8f8a85;font-size:12px}' +
    '.sumi-pirate{position:sticky;top:0;z-index:9999;background:#E03131;color:#fff;text-align:center;padding:10px 14px;font-weight:700}.sumi-pirate a{color:#fff}' +
    'svg[viewBox="-72 -66 144 132"],svg[viewBox="-74 -74 148 148"]{-webkit-user-drag:none;user-select:none;-webkit-touch-callout:none}' +
    '@media print{.sumi-footer{margin:0;padding:6px 0 0;background:none;color:#888;font-size:9px}.sf-links,.sf-src,.sf-brand span{display:none}.sf-brand b,.sf-copy b{color:#888;font-size:9px}.sumi-pirate{display:none}}';
  const st = document.createElement('style');
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  function init() {
    footer();
    domainGuard();
    consoleNote();
  }
  document.addEventListener('copy', copyCredit);
  document.addEventListener('contextmenu', guardMascot);
  document.addEventListener('dragstart', guardMascot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
