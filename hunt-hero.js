/*! © 2026 Sumi Kanji */
// ===== Phụ kiện cho nhân vật Hiyo trong game Săn cầu chữ: dữ liệu, công năng, hình vẽ =====
window.HuntGear = (function () {
  // ô trang bị: mỗi ô chỉ đeo được 1 món
  const SLOTS = [
    ['head', 'Đầu'], ['face', 'Mặt'], ['body', 'Thân'], ['back', 'Lưng'], ['hand', 'Tay'], ['feet', 'Chân'], ['aura', 'Hào quang']
  ];
  // r: 1 thường · 2 hiếm · 3 huyền thoại
  const LIST = [
    { id: 'helmet', slot: 'head', r: 2, name: 'Mũ giáp sắt', desc: 'Bị quái bắt vẫn giữ nguyên cấp tiến hoá.' },
    { id: 'crown', slot: 'head', r: 2, name: 'Vương miện', desc: 'Nhặt vàng được gấp đôi.' },
    { id: 'wizard', slot: 'head', r: 3, name: 'Mũ phù thuỷ', desc: 'Đạn tự đuổi theo quái thú.' },
    { id: 'cat', slot: 'head', r: 1, name: 'Tai mèo', desc: 'Hút vàng ở gần (2 ô).' },
    { id: 'horn', slot: 'head', r: 3, name: 'Sừng kỳ lân', desc: 'Đạn xuyên qua mọi quái thú.' },
    { id: 'shades', slot: 'face', r: 2, name: 'Kính râm ngầu', desc: 'Đạn to hơn, +1 sát thương.' },
    { id: 'mask', slot: 'face', r: 2, name: 'Khăn ninja', desc: 'Quái thú khó phát hiện bạn (tầm nhìn giảm một nửa).' },
    { id: 'goggles', slot: 'face', r: 1, name: 'Kính thám hiểm', desc: 'Ra-đa nhìn xa gấp đôi.' },
    { id: 'blush', slot: 'face', r: 1, name: 'Má hồng', desc: 'Dễ thương quá! Quái thú đi chậm hơn 15%.' },
    { id: 'armor', slot: 'body', r: 2, name: 'Áo giáp', desc: 'Chặn 1 đòn của quái, tự hồi sau 20 giây.' },
    { id: 'cape', slot: 'body', r: 1, name: 'Áo choàng anh hùng', desc: 'Chạy nhanh hơn 20%.' },
    { id: 'spike', slot: 'body', r: 2, name: 'Áo gai', desc: 'Quái thú chạm vào bị gai đâm mất máu.' },
    { id: 'bowtie', slot: 'body', r: 1, name: 'Nơ xinh', desc: 'Quái thú rơi thêm 2 vàng.' },
    { id: 'wings', slot: 'back', r: 3, name: 'Đôi cánh', desc: 'Bay qua cây, đá và mặt nước.' },
    { id: 'jet', slot: 'back', r: 2, name: 'Ba lô phản lực', desc: 'Chạy nhanh hơn 45%.' },
    { id: 'bag', slot: 'back', r: 1, name: 'Ba lô to', desc: 'Thêm 1 ô mạng tối đa.' },
    { id: 'dragon', slot: 'back', r: 3, name: 'Đuôi rồng lửa', desc: 'Để lại vệt lửa thiêu quái thú.' },
    { id: 'balloon', slot: 'back', r: 2, name: 'Bóng bay cứu hộ', desc: 'Hết mạng thì được cứu sống lại 1 lần (bóng sẽ bay mất).' },
    { id: 'hands', slot: 'hand', r: 2, name: 'Thêm hai bàn tay', desc: 'Bắn thêm 2 viên đạn chéo.' },
    { id: 'sword', slot: 'hand', r: 2, name: 'Kiếm gỗ', desc: 'Tự chém xoay vòng khi quái áp sát.' },
    { id: 'magnet', slot: 'hand', r: 1, name: 'Nam châm', desc: 'Hút vàng từ xa (5 ô).' },
    { id: 'wand', slot: 'hand', r: 2, name: 'Đũa phép', desc: 'Bắn nhanh hơn 40%.' },
    { id: 'shield', slot: 'hand', r: 1, name: 'Khiên tròn', desc: '50% đỡ được đòn của quái.' },
    { id: 'boots', slot: 'feet', r: 1, name: 'Giày gió', desc: 'Chạy nhanh hơn 35%.' },
    { id: 'flipper', slot: 'feet', r: 1, name: 'Chân vịt', desc: 'Bơi qua mặt nước.' },
    { id: 'skates', slot: 'feet', r: 2, name: 'Giày trượt', desc: 'Lướt cực nhanh trên đường đất (+70%).' },
    { id: 'halo', slot: 'aura', r: 3, name: 'Vầng hào quang', desc: 'Cứ 60 giây hồi 1 mạng.' },
    { id: 'clock', slot: 'aura', r: 2, name: 'Đồng hồ cát', desc: 'Quái thú chậm hơn 35%.' },
    { id: 'star', slot: 'aura', r: 2, name: 'Sao may mắn', desc: 'Dễ nhặt được phụ kiện hiếm hơn.' },
    { id: 'lantern', slot: 'aura', r: 1, name: 'Đèn lồng', desc: 'Soi thấy quái thú trên ra-đa.' }
  ];
  const BY = {}; LIST.forEach((g) => { BY[g.id] = g; });
  const RNAME = ['', 'Thường', 'Hiếm', 'Huyền thoại'], RCOL = ['', '#22c55e', '#3b82f6', '#f59e0b'];
  const BEHIND = new Set(['wings', 'jet', 'bag', 'dragon', 'balloon', 'cape', 'clock', 'star', 'lantern']);

  // chọn ngẫu nhiên 1 món, món hiếm ít gặp hơn
  function roll(lucky) {
    const w = LIST.map((g) => (g.r === 1 ? 10 : g.r === 2 ? (lucky ? 7 : 4.5) : (lucky ? 3 : 1.4)));
    let s = w.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < LIST.length; i++) { s -= w[i]; if (s <= 0) return LIST[i].id; }
    return LIST[0].id;
  }

  // ---------- Hình vẽ từng món (tâm 0,0, cỡ s) ----------
  function star(c, x, y, r, n) { n = n || 5; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  const D = {
    helmet(c, s) { c.fillStyle = '#9ca3af'; c.strokeStyle = '#374151'; c.lineWidth = s * 0.05; c.beginPath(); c.arc(0, s * 0.1, s * 0.42, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#d1d5db'; c.fillRect(-s * 0.46, s * 0.06, s * 0.92, s * 0.1); c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-s * 0.06, -s * 0.32); c.quadraticCurveTo(0, -s * 0.6, s * 0.12, -s * 0.5); c.lineTo(s * 0.06, -s * 0.3); c.fill(); },
    crown(c, s) { c.fillStyle = '#facc15'; c.strokeStyle = '#a16207'; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.42, s * 0.25); c.lineTo(-s * 0.42, -s * 0.15); c.lineTo(-s * 0.21, s * 0.05); c.lineTo(0, -s * 0.3); c.lineTo(s * 0.21, s * 0.05); c.lineTo(s * 0.42, -s * 0.15); c.lineTo(s * 0.42, s * 0.25); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ef4444'; c.beginPath(); c.arc(0, s * 0.12, s * 0.07, 0, 7); c.fill(); c.fillStyle = '#3b82f6'; c.beginPath(); c.arc(-s * 0.24, s * 0.14, s * 0.05, 0, 7); c.arc(s * 0.24, s * 0.14, s * 0.05, 0, 7); c.fill(); },
    wizard(c, s) { c.fillStyle = '#7c3aed'; c.strokeStyle = '#3b0764'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(-s * 0.45, s * 0.3); c.quadraticCurveTo(0, s * 0.18, s * 0.45, s * 0.3); c.lineTo(s * 0.1, -s * 0.2); c.quadraticCurveTo(s * 0.2, -s * 0.48, s * 0.38, -s * 0.5); c.quadraticCurveTo(0, -s * 0.5, -s * 0.1, -s * 0.2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fde047'; star(c, -s * 0.02, s * 0.05, s * 0.11); },
    cat(c, s) { [[-1], [1]].forEach(([k]) => { c.fillStyle = '#fef3c7'; c.strokeStyle = '#92400e'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(k * s * 0.42, s * 0.2); c.lineTo(k * s * 0.3, -s * 0.38); c.lineTo(k * s * 0.05, s * 0.12); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#f9a8d4'; c.beginPath(); c.moveTo(k * s * 0.34, s * 0.12); c.lineTo(k * s * 0.29, -s * 0.2); c.lineTo(k * s * 0.15, s * 0.08); c.closePath(); c.fill(); }); },
    horn(c, s) { const g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.3); g.addColorStop(0, '#fef9c3'); g.addColorStop(1, '#f9a8d4'); c.fillStyle = g; c.strokeStyle = '#a21caf'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(-s * 0.14, s * 0.3); c.lineTo(0, -s * 0.5); c.lineTo(s * 0.14, s * 0.3); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#e879f9'; c.beginPath(); for (let i = 0; i < 4; i++) { const y = s * 0.2 - i * s * 0.17; c.moveTo(-s * 0.12 + i * s * 0.03, y); c.lineTo(s * 0.12 - i * s * 0.03, y - s * 0.07); } c.stroke(); },
    shades(c, s) { c.fillStyle = '#111827'; rr(c, -s * 0.46, -s * 0.12, s * 0.4, s * 0.24, s * 0.08); c.fill(); rr(c, s * 0.06, -s * 0.12, s * 0.4, s * 0.24, s * 0.08); c.fill(); c.fillRect(-s * 0.08, -s * 0.08, s * 0.16, s * 0.05); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-s * 0.4, -s * 0.07, s * 0.1, s * 0.04); c.fillRect(s * 0.12, -s * 0.07, s * 0.1, s * 0.04); },
    mask(c, s) { c.fillStyle = '#1f2937'; rr(c, -s * 0.48, -s * 0.13, s * 0.96, s * 0.26, s * 0.1); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-s * 0.17, 0, s * 0.09, s * 0.05, 0.15, 0, 7); c.ellipse(s * 0.17, 0, s * 0.09, s * 0.05, -0.15, 0, 7); c.fill(); c.fillStyle = '#1f2937'; c.beginPath(); c.moveTo(s * 0.46, -s * 0.05); c.lineTo(s * 0.6, -s * 0.18); c.lineTo(s * 0.56, s * 0.02); c.fill(); },
    goggles(c, s) { c.strokeStyle = '#0f766e'; c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(-s * 0.5, 0); c.lineTo(s * 0.5, 0); c.stroke(); [-1, 1].forEach((k) => { c.fillStyle = '#67e8f9'; c.strokeStyle = '#155e75'; c.lineWidth = s * 0.06; c.beginPath(); c.arc(k * s * 0.2, 0, s * 0.16, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(k * s * 0.2 - s * 0.05, -s * 0.05, s * 0.04, 0, 7); c.fill(); }); },
    blush(c, s) { c.fillStyle = 'rgba(244,114,182,.75)'; c.beginPath(); c.ellipse(-s * 0.28, 0, s * 0.13, s * 0.08, 0, 0, 7); c.ellipse(s * 0.28, 0, s * 0.13, s * 0.08, 0, 0, 7); c.fill(); c.fillStyle = '#ec4899'; star(c, 0, -s * 0.28, s * 0.09); },
    armor(c, s) { const g = c.createLinearGradient(-s * 0.4, 0, s * 0.4, 0); g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#f8fafc'); g.addColorStop(1, '#94a3b8'); c.fillStyle = g; c.strokeStyle = '#475569'; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.3); c.lineTo(s * 0.4, -s * 0.3); c.lineTo(s * 0.34, s * 0.2); c.quadraticCurveTo(0, s * 0.45, -s * 0.34, s * 0.2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#f59e0b'; star(c, 0, -s * 0.02, s * 0.12); },
    cape(c, s) { c.fillStyle = '#dc2626'; c.strokeStyle = '#7f1d1d'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(-s * 0.25, -s * 0.45); c.lineTo(s * 0.25, -s * 0.45); c.quadraticCurveTo(s * 0.55, s * 0.1, s * 0.45, s * 0.48); c.lineTo(-s * 0.45, s * 0.48); c.quadraticCurveTo(-s * 0.55, s * 0.1, -s * 0.25, -s * 0.45); c.fill(); c.stroke(); c.fillStyle = '#facc15'; c.beginPath(); c.arc(0, -s * 0.42, s * 0.07, 0, 7); c.fill(); },
    spike(c, s) { c.fillStyle = '#16a34a'; c.strokeStyle = '#14532d'; c.lineWidth = s * 0.04; c.beginPath(); c.ellipse(0, 0, s * 0.38, s * 0.3, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#f0fdf4'; for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a - 0.15) * s * 0.36, Math.sin(a - 0.15) * s * 0.28); c.lineTo(Math.cos(a) * s * 0.52, Math.sin(a) * s * 0.44); c.lineTo(Math.cos(a + 0.15) * s * 0.36, Math.sin(a + 0.15) * s * 0.28); c.fill(); } },
    bowtie(c, s) { c.fillStyle = '#f472b6'; c.strokeStyle = '#9d174d'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(0, 0); c.lineTo(-s * 0.4, -s * 0.24); c.lineTo(-s * 0.4, s * 0.24); c.closePath(); c.moveTo(0, 0); c.lineTo(s * 0.4, -s * 0.24); c.lineTo(s * 0.4, s * 0.24); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#db2777'; c.beginPath(); c.arc(0, 0, s * 0.1, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * 0.22, -s * 0.05, s * 0.04, 0, 7); c.arc(s * 0.22, s * 0.06, s * 0.04, 0, 7); c.fill(); },
    wings(c, s, t) { const f = Math.sin((t || 0) * 8) * 0.18; [-1, 1].forEach((k) => { c.save(); c.scale(k, 1); c.rotate(-f); c.fillStyle = '#fff'; c.strokeStyle = '#93c5fd'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(s * 0.05, 0); c.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.52, -s * 0.4); c.quadraticCurveTo(s * 0.48, -s * 0.2, s * 0.4, -s * 0.12); c.quadraticCurveTo(s * 0.46, -s * 0.02, s * 0.34, s * 0.06); c.quadraticCurveTo(s * 0.36, s * 0.16, s * 0.22, s * 0.18); c.quadraticCurveTo(s * 0.12, s * 0.12, s * 0.05, 0); c.fill(); c.stroke(); c.restore(); }); },
    jet(c, s, t) { [-1, 1].forEach((k) => { c.fillStyle = '#64748b'; c.strokeStyle = '#1e293b'; c.lineWidth = s * 0.04; rr(c, k * s * 0.2 - s * 0.13, -s * 0.3, s * 0.26, s * 0.5, s * 0.1); c.fill(); c.stroke(); const fl = 0.8 + Math.sin((t || 0) * 30 + k) * 0.2; c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(k * s * 0.2 - s * 0.1, s * 0.22); c.lineTo(k * s * 0.2, s * 0.22 + s * 0.3 * fl); c.lineTo(k * s * 0.2 + s * 0.1, s * 0.22); c.fill(); c.fillStyle = '#fde047'; c.beginPath(); c.moveTo(k * s * 0.2 - s * 0.05, s * 0.22); c.lineTo(k * s * 0.2, s * 0.22 + s * 0.16 * fl); c.lineTo(k * s * 0.2 + s * 0.05, s * 0.22); c.fill(); }); c.fillStyle = '#ef4444'; c.fillRect(-s * 0.08, -s * 0.2, s * 0.16, s * 0.3); },
    bag(c, s) { c.fillStyle = '#facc15'; c.strokeStyle = '#a16207'; c.lineWidth = s * 0.05; rr(c, -s * 0.34, -s * 0.36, s * 0.68, s * 0.72, s * 0.16); c.fill(); c.stroke(); c.fillStyle = '#fb923c'; rr(c, -s * 0.24, 0, s * 0.48, s * 0.26, s * 0.06); c.fill(); c.strokeStyle = '#a16207'; c.beginPath(); c.arc(0, -s * 0.36, s * 0.14, Math.PI, 0); c.stroke(); },
    dragon(c, s, t) { const w = Math.sin((t || 0) * 5) * s * 0.06; c.fillStyle = '#dc2626'; c.strokeStyle = '#7f1d1d'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(-s * 0.1, -s * 0.2); c.quadraticCurveTo(s * 0.3, -s * 0.1 + w, s * 0.25, s * 0.2); c.quadraticCurveTo(s * 0.2, s * 0.42, s * 0.45, s * 0.38 - w); c.lineTo(s * 0.38, s * 0.48); c.quadraticCurveTo(s * 0.05, s * 0.45, s * 0.1, s * 0.2); c.quadraticCurveTo(s * 0.12, 0, -s * 0.1, -s * 0.05); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(s * 0.4, s * 0.36); c.lineTo(s * 0.6, s * 0.3 - w); c.lineTo(s * 0.5, s * 0.5); c.fill(); },
    balloon(c, s, t) { const b = Math.sin((t || 0) * 2) * s * 0.04; c.strokeStyle = '#78716c'; c.lineWidth = s * 0.02; c.beginPath(); c.moveTo(0, s * 0.45); c.quadraticCurveTo(s * 0.06, s * 0.15, 0, -s * 0.02 + b); c.stroke(); c.fillStyle = '#ef4444'; c.beginPath(); c.ellipse(0, -s * 0.24 + b, s * 0.2, s * 0.25, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-s * 0.07, -s * 0.32 + b, s * 0.05, s * 0.08, -0.4, 0, 7); c.fill(); },
    hands(c, s) { [-1, 1].forEach((k) => { c.fillStyle = '#fde68a'; c.strokeStyle = '#a16207'; c.lineWidth = s * 0.04; c.beginPath(); c.ellipse(k * s * 0.24, 0, s * 0.17, s * 0.14, 0, 0, 7); c.fill(); c.stroke(); for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(k * s * 0.24 + i * s * 0.08, -s * 0.14, s * 0.04, s * 0.07, 0, 0, 7); c.fill(); c.stroke(); } }); },
    sword(c, s) { c.save(); c.rotate(-0.6); c.fillStyle = '#d6a76a'; c.strokeStyle = '#78350f'; c.lineWidth = s * 0.04; rr(c, -s * 0.06, -s * 0.5, s * 0.12, s * 0.62, s * 0.05); c.fill(); c.stroke(); c.fillStyle = '#92400e'; c.fillRect(-s * 0.2, s * 0.1, s * 0.4, s * 0.08); c.fillRect(-s * 0.05, s * 0.18, s * 0.1, s * 0.22); c.restore(); },
    magnet(c, s) { c.lineWidth = s * 0.18; c.strokeStyle = '#dc2626'; c.beginPath(); c.arc(0, -s * 0.05, s * 0.24, Math.PI, 0); c.stroke(); c.fillStyle = '#dc2626'; c.fillRect(-s * 0.33, -s * 0.06, s * 0.18, s * 0.2); c.fillRect(s * 0.15, -s * 0.06, s * 0.18, s * 0.2); c.fillStyle = '#e5e7eb'; c.fillRect(-s * 0.33, s * 0.14, s * 0.18, s * 0.14); c.fillRect(s * 0.15, s * 0.14, s * 0.18, s * 0.14); },
    wand(c, s, t) { c.save(); c.rotate(0.5); c.fillStyle = '#7c2d12'; c.fillRect(-s * 0.04, -s * 0.15, s * 0.08, s * 0.6); c.restore(); c.fillStyle = '#facc15'; c.save(); c.translate(-s * 0.1, -s * 0.24); c.rotate((t || 0) * 2); star(c, 0, 0, s * 0.2); c.restore(); },
    shield(c, s) { c.fillStyle = '#2563eb'; c.strokeStyle = '#1e3a8a'; c.lineWidth = s * 0.05; c.beginPath(); c.arc(0, 0, s * 0.38, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#facc15'; c.beginPath(); c.arc(0, 0, s * 0.24, 0, 7); c.fill(); c.fillStyle = '#dc2626'; c.beginPath(); c.arc(0, 0, s * 0.11, 0, 7); c.fill(); },
    boots(c, s) { [-1, 1].forEach((k) => { c.fillStyle = '#38bdf8'; c.strokeStyle = '#075985'; c.lineWidth = s * 0.04; rr(c, k * s * 0.24 - s * 0.14, -s * 0.12, s * 0.28, s * 0.26, s * 0.08); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(k * s * 0.38, -s * 0.06); c.quadraticCurveTo(k * s * 0.56, -s * 0.2, k * s * 0.52, s * 0.02); c.closePath(); c.fill(); }); },
    flipper(c, s) { [-1, 1].forEach((k) => { c.fillStyle = '#22c55e'; c.strokeStyle = '#14532d'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(k * s * 0.2, -s * 0.1); c.lineTo(k * s * 0.42, s * 0.2); c.quadraticCurveTo(k * s * 0.24, s * 0.28, k * s * 0.06, s * 0.2); c.closePath(); c.fill(); c.stroke(); }); },
    skates(c, s) { [-1, 1].forEach((k) => { c.fillStyle = '#f472b6'; c.strokeStyle = '#831843'; c.lineWidth = s * 0.04; rr(c, k * s * 0.24 - s * 0.15, -s * 0.16, s * 0.3, s * 0.22, s * 0.07); c.fill(); c.stroke(); c.fillStyle = '#facc15'; c.beginPath(); c.arc(k * s * 0.24 - s * 0.09, s * 0.12, s * 0.05, 0, 7); c.arc(k * s * 0.24 + s * 0.09, s * 0.12, s * 0.05, 0, 7); c.fill(); }); },
    halo(c, s, t) { c.strokeStyle = '#facc15'; c.lineWidth = s * 0.08; c.shadowColor = '#fde047'; c.shadowBlur = s * 0.2; c.beginPath(); c.ellipse(0, 0, s * 0.36, s * 0.12, 0, 0, 7); c.stroke(); c.shadowBlur = 0; },
    clock(c, s, t) { c.save(); c.rotate(Math.sin((t || 0) * 2) * 0.3); c.fillStyle = '#92400e'; c.fillRect(-s * 0.24, -s * 0.36, s * 0.48, s * 0.07); c.fillRect(-s * 0.24, s * 0.29, s * 0.48, s * 0.07); c.fillStyle = 'rgba(186,230,253,.9)'; c.strokeStyle = '#0369a1'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(-s * 0.18, -s * 0.29); c.lineTo(s * 0.18, -s * 0.29); c.lineTo(0, 0); c.lineTo(s * 0.18, s * 0.29); c.lineTo(-s * 0.18, s * 0.29); c.lineTo(0, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fbbf24'; c.beginPath(); c.moveTo(-s * 0.1, s * 0.27); c.lineTo(s * 0.1, s * 0.27); c.lineTo(0, s * 0.12); c.fill(); c.restore(); },
    star(c, s, t) { c.save(); c.rotate((t || 0) * 1.5); c.fillStyle = '#facc15'; c.strokeStyle = '#a16207'; c.lineWidth = s * 0.04; star(c, 0, 0, s * 0.42); c.stroke(); c.fillStyle = '#fff'; star(c, -s * 0.08, -s * 0.08, s * 0.1, 4); c.restore(); },
    lantern(c, s, t) { c.strokeStyle = '#78350f'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(0, -s * 0.48); c.lineTo(0, -s * 0.34); c.stroke(); const gl = 0.6 + Math.sin((t || 0) * 4) * 0.2; c.shadowColor = '#fbbf24'; c.shadowBlur = s * 0.4 * gl; c.fillStyle = '#ef4444'; c.beginPath(); c.ellipse(0, 0, s * 0.3, s * 0.34, 0, 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = '#facc15'; c.fillRect(-s * 0.16, -s * 0.38, s * 0.32, s * 0.07); c.fillRect(-s * 0.16, s * 0.31, s * 0.32, s * 0.07); c.strokeStyle = 'rgba(127,29,29,.6)'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(-s * 0.15, -s * 0.3); c.quadraticCurveTo(-s * 0.2, 0, -s * 0.15, s * 0.3); c.moveTo(s * 0.15, -s * 0.3); c.quadraticCurveTo(s * 0.2, 0, s * 0.15, s * 0.3); c.stroke(); }
  };
  function drawIcon(c, id, s, t) { if (D[id]) { c.save(); D[id](c, s, t); c.restore(); } }

  // vị trí đeo theo ô (so với hình Hiyo cỡ sz, chân ở y = 0)
  const ANCHOR = {
    head: (sz) => [0, -sz * 0.9, sz * 0.62], face: (sz) => [0, -sz * 0.52, sz * 0.55], body: (sz) => [0, -sz * 0.22, sz * 0.5],
    back: (sz) => [0, -sz * 0.5, sz * 1.05], hand: (sz) => [sz * 0.5, -sz * 0.32, sz * 0.42], feet: (sz) => [0, -sz * 0.04, sz * 0.62], aura: (sz) => [0, -sz * 0.5, sz * 0.5]
  };
  const SPECIAL = { cape: (sz) => [0, -sz * 0.4, sz * 0.95], halo: (sz) => [0, -sz * 1.08, sz * 0.7], balloon: (sz) => [-sz * 0.55, -sz * 0.9, sz * 0.9], lantern: (sz) => [-sz * 0.6, -sz * 0.6, sz * 0.38], clock: (sz) => [-sz * 0.62, -sz * 0.75, sz * 0.38], star: (sz) => [-sz * 0.6, -sz * 0.95, sz * 0.38], dragon: (sz) => [-sz * 0.35, -sz * 0.2, sz * 0.75], bag: (sz) => [-sz * 0.12, -sz * 0.45, sz * 0.6], jet: (sz) => [0, -sz * 0.45, sz * 0.8] };
  // vẽ Hiyo kèm phụ kiện: img là ảnh Hiyo, (cx, by) là điểm giữa chân
  function drawHero(c, img, cx, by, sz, eq, t, face) {
    const ids = Object.values(eq || {}).filter((id) => BY[id]);
    const at = (id) => (SPECIAL[id] || ANCHOR[BY[id].slot])(sz);
    c.save(); c.translate(cx, by);
    ids.filter((id) => BEHIND.has(id)).forEach((id) => { const [x, y, s] = at(id); c.save(); c.translate(x * (face || 1), y); drawIcon(c, id, s, t); c.restore(); });
    c.save(); c.scale(face || 1, 1); if (img && img.complete) c.drawImage(img, -sz / 2, -sz, sz, sz * 0.95); c.restore();
    ids.filter((id) => !BEHIND.has(id)).forEach((id) => { const [x, y, s] = at(id); c.save(); c.translate(x * (BY[id].slot === 'hand' ? (face || 1) : 1), y); drawIcon(c, id, s, t); c.restore(); });
    c.restore();
  }
  // ảnh biểu tượng (dùng trong DOM)
  const ICON = {};
  function iconURL(id, px) {
    px = px || 64; const k = id + px; if (ICON[k]) return ICON[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = px * 2; const c = cv.getContext('2d');
    c.scale(2, 2); c.translate(px / 2, px / 2); drawIcon(c, id, px * 0.8, 0.3);
    return (ICON[k] = cv.toDataURL());
  }
  return { SLOTS, LIST, BY, RNAME, RCOL, roll, drawIcon, drawHero, iconURL };
})();
