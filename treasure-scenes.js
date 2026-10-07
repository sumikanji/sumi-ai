/*! © 2026 Sumi Kanji */
// ===== Phong cảnh Việt Nam cho game Hiyo truy tìm kho báu (vẽ bằng canvas, không dùng ảnh ngoài) =====
(function () {
  const GY = 416; // mặt đất
  // số giả ngẫu nhiên cố định theo chỉ số (để nhà/cửa sổ không nhấp nháy)
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // lặp một hình theo chu kỳ trên lớp có hệ số thị sai k
  function rep(ctx, cam, VW, k, period, offset, fn) {
    const base = offset - cam * k;
    const n0 = Math.floor((-base - period) / period);
    for (let n = n0; ; n++) { const x = base + n * period; if (x > VW + period) break; if (x > -period * 1.2) fn(x, n); }
  }
  function grad(ctx, stops, y0, y1) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function label(ctx, text, x, y) {
    ctx.font = '800 10px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(ctx, x - w / 2, y - 8, w, 16, 8); ctx.fill();
    ctx.fillStyle = '#44403c'; ctx.fillText(text, x, y + 0.5);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function cloud(ctx, x, y, s) { ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 7); ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, 7); ctx.arc(x + 44 * s, y, 18 * s, 0, 7); ctx.fill(); }
  function clouds(ctx, cam, VW, color) { ctx.fillStyle = color; rep(ctx, cam, VW, 0.12, 300, 40, (x, n) => cloud(ctx, x, 40 + hash(n) * 70, 0.8 + hash(n + 9) * 0.5)); }
  function stars(ctx, VW, t) {
    for (let i = 0; i < 40; i++) { const x = hash(i) * VW, y = hash(i + 50) * 170; ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 2, 2); }
    ctx.globalAlpha = 1;
  }
  function hills(ctx, cam, VW, k, base, amp, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, GY + 60);
    for (let x = 0; x <= VW + 20; x += 16) { const wx = x + cam * k; ctx.lineTo(x, base - Math.abs(Math.sin(wx / 260)) * amp - Math.sin(wx / 83) * amp * 0.15); }
    ctx.lineTo(VW + 20, GY + 60); ctx.fill();
  }
  function water(ctx, VW, y0, color, t, glints) {
    ctx.fillStyle = color; ctx.fillRect(0, y0, VW + 2, GY + 70 - y0);
    ctx.strokeStyle = glints || 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const x = (hash(i) * VW + t * 12 * (i % 2 ? 1 : -1)) % (VW + 40), y = y0 + 6 + hash(i + 7) * (GY - y0 - 8); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 + hash(i + 3) * 18, y); ctx.stroke(); }
  }
  // nước dưới hố (vẽ theo tọa độ thế giới, đất sẽ che chỗ không phải hố)
  function pitWater(ctx, cam, VW, color, t) {
    ctx.fillStyle = color; ctx.fillRect(cam - 10, GY + 14, VW + 20, 60);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (let x = Math.floor(cam / 24) * 24; x < cam + VW + 24; x += 24) { ctx.beginPath(); ctx.ellipse(x + 12 + Math.sin(t * 2 + x) * 3, GY + 16, 9, 2.5, 0, 0, 7); ctx.fill(); }
  }
  function tree(ctx, x, y, r, c1, c2) { ctx.fillStyle = '#6b4f3a'; ctx.fillRect(x - 3, y - r, 6, r); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - r - r * 0.4, r * 0.75, 0, 7); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 1.2, r * 0.5, 0, 7); ctx.fill(); }
  function curvedRoof(ctx, x, y, w, h, color) {
    // mái cong vểnh hai đầu
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x - w / 2 - 8, y - 6); ctx.quadraticCurveTo(x - w / 2, y, x - w / 2 + 6, y);
    ctx.lineTo(x + w / 2 - 6, y); ctx.quadraticCurveTo(x + w / 2, y, x + w / 2 + 8, y - 6);
    ctx.lineTo(x + w / 2 - 6, y - h); ctx.lineTo(x - w / 2 + 6, y - h); ctx.closePath(); ctx.fill();
  }

  // ---------------- HÀ NỘI: Hồ Gươm, Tháp Rùa, cầu Thê Húc ----------------
  function turtleTower(ctx, x) {
    ctx.fillStyle = '#5e9c5a'; ctx.beginPath(); ctx.ellipse(x, 380, 76, 11, 0, 0, 7); ctx.fill();
    tree(ctx, x - 52, 380, 16, '#4f8a4c', '#67a862'); tree(ctx, x + 56, 380, 14, '#4f8a4c', '#67a862');
    const wall = '#ece0c4', roof = '#7b4b2a', dark = '#5b4636';
    ctx.fillStyle = wall; ctx.fillRect(x - 26, 336, 52, 42);
    ctx.fillStyle = dark; [-15, 0, 15].forEach((d) => { ctx.beginPath(); ctx.moveTo(x + d - 5, 378); ctx.lineTo(x + d - 5, 360); ctx.arc(x + d, 360, 5, Math.PI, 0); ctx.lineTo(x + d + 5, 378); ctx.fill(); });
    curvedRoof(ctx, x, 338, 60, 6, roof);
    ctx.fillStyle = wall; ctx.fillRect(x - 17, 308, 34, 26);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x - 5, 330); ctx.lineTo(x - 5, 318); ctx.arc(x, 318, 5, Math.PI, 0); ctx.lineTo(x + 5, 330); ctx.fill();
    curvedRoof(ctx, x, 310, 42, 5, roof);
    ctx.fillStyle = wall; ctx.fillRect(x - 10, 288, 20, 18);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, 297, 4, 0, 7); ctx.fill();
    curvedRoof(ctx, x, 290, 28, 8, roof);
    ctx.fillStyle = roof; ctx.fillRect(x - 1.5, 272, 3, 12);
    label(ctx, 'Tháp Rùa', x, 260);
  }
  function hucBridge(ctx, x, t) {
    // cầu Thê Húc cong, sơn đỏ, dẫn vào đền Ngọc Sơn
    const red = '#c8102e', y0 = 376, len = 230;
    ctx.strokeStyle = red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + len / 2, y0 - 46, x + len, y0); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y0 - 12); ctx.quadraticCurveTo(x + len / 2, y0 - 58, x + len, y0 - 12); ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 1; i < 20; i++) { const u = i / 20, px = x + u * len, py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 - 46) + u * u * y0; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 12); ctx.stroke(); }
    // cổng Thê Húc
    ctx.fillStyle = '#8b2c1e'; ctx.fillRect(x - 30, 336, 8, 44); ctx.fillRect(x - 8, 336, 8, 44); curvedRoof(ctx, x - 15, 338, 34, 6, '#5a2a18');
    // đền Ngọc Sơn
    const tx = x + len + 46;
    ctx.fillStyle = '#5e9c5a'; ctx.beginPath(); ctx.ellipse(tx, 382, 80, 10, 0, 0, 7); ctx.fill();
    tree(ctx, tx + 62, 382, 20, '#3f7d45', '#58a35a'); tree(ctx, tx - 66, 382, 16, '#3f7d45', '#58a35a');
    ctx.fillStyle = '#e6c88a'; ctx.fillRect(tx - 40, 346, 80, 34);
    ctx.fillStyle = '#9b2c1f'; for (let i = 0; i < 5; i++) ctx.fillRect(tx - 34 + i * 16, 352, 6, 28);
    curvedRoof(ctx, tx, 348, 96, 12, '#6b3a1f'); curvedRoof(ctx, tx, 330, 56, 10, '#6b3a1f');
    label(ctx, 'Cầu Thê Húc', x + len / 2, y0 - 70);
    label(ctx, 'Đền Ngọc Sơn', tx, 304);
  }
  function willow(ctx, x, t, s) {
    ctx.strokeStyle = '#6b4f3a'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(x, GY); ctx.quadraticCurveTo(x - 10 * s, GY - 50 * s, x + 6 * s, GY - 110 * s); ctx.stroke();
    ctx.fillStyle = '#8cc37a'; ctx.beginPath(); ctx.ellipse(x + 4 * s, GY - 118 * s, 52 * s, 26 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(101,163,84,.9)'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) { const sx = x - 44 * s + i * 6 * s, sw = Math.sin(t * 1.5 + i) * 4; ctx.beginPath(); ctx.moveTo(sx, GY - 118 * s); ctx.quadraticCurveTo(sx + sw, GY - 80 * s, sx + sw * 2, GY - (40 + hash(i) * 30) * s); ctx.stroke(); }
  }
  function lamp(ctx, x, glow) {
    ctx.fillStyle = '#292524'; ctx.fillRect(x - 2, GY - 64, 4, 64); ctx.fillRect(x - 7, GY - 4, 14, 4);
    ctx.beginPath(); ctx.moveTo(x - 8, GY - 66); ctx.lineTo(x + 8, GY - 66); ctx.lineTo(x + 5, GY - 80); ctx.lineTo(x - 5, GY - 80); ctx.fill();
    if (glow) { const g = ctx.createRadialGradient(x, GY - 72, 2, x, GY - 72, 34); g.addColorStop(0, 'rgba(255,214,120,.85)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, GY - 72, 34, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fde68a'; ctx.fillRect(x - 4, GY - 77, 8, 9);
  }

  // ---------------- HỘI AN: phố cổ, Chùa Cầu, đèn lồng ----------------
  const LANTERN = ['#ef4444', '#f59e0b', '#facc15', '#a855f7', '#22c55e', '#ec4899', '#3b82f6'];
  const lc = (n) => LANTERN[((Math.round(n) % LANTERN.length) + LANTERN.length) % LANTERN.length];
  function lantern(ctx, x, y, color, r, t, i) {
    const sw = Math.sin(t * 2 + i) * 2;
    ctx.save(); ctx.translate(x + sw, y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.4); g.addColorStop(0, color + 'aa'); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.25, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.3, r * 0.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(-r * 0.5, -r * 1.35, r, 3); ctx.fillRect(-r * 0.5, r * 1.15, r, 3);
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, r * 1.3); ctx.lineTo(0, r * 2); ctx.stroke();
    ctx.restore();
  }
  function oldHouse(ctx, x, n, t) {
    const h = 34 + Math.floor(hash(n) * 3) * 10, w = 70 + Math.floor(hash(n + 4) * 3) * 12, y = 364 - h;
    ctx.fillStyle = hash(n + 2) > 0.3 ? '#f2c14e' : '#e9a23b'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x, y + h - 8, w, 8);
    ctx.fillStyle = '#7a3b1e'; ctx.beginPath(); ctx.moveTo(x - 8, y + 2); ctx.lineTo(x + 10, y - 16); ctx.lineTo(x + w - 10, y - 16); ctx.lineTo(x + w + 8, y + 2); ctx.fill();
    ctx.strokeStyle = '#5a2a14'; ctx.lineWidth = 1; for (let k = x; k < x + w; k += 6) { ctx.beginPath(); ctx.moveTo(k, y - 14); ctx.lineTo(k - 3, y); ctx.stroke(); }
    ctx.fillStyle = '#6b3a1f'; ctx.fillRect(x + w / 2 - 9, y + h - 24, 18, 24);
    ctx.fillStyle = '#ffd88a'; ctx.fillRect(x + 8, y + 10, 12, 10); ctx.fillRect(x + w - 20, y + 10, 12, 10);
    if (h > 44) { ctx.fillStyle = '#6b3a1f'; ctx.fillRect(x + 4, y + 24, w - 8, 3); }
    lantern(ctx, x + 14, y + 6, lc(n), 4, t, n);
    lantern(ctx, x + w - 14, y + 6, lc(n + 3), 4, t, n + 1);
  }
  function coveredBridge(ctx, x) {
    // Chùa Cầu: chân vòm đá, thân gỗ, mái ngói có lầu giữa
    ctx.fillStyle = '#a8a29e'; ctx.fillRect(x, 344, 150, 22);
    ctx.fillStyle = '#2b3f6b'; ctx.beginPath(); ctx.moveTo(x + 50, 366); ctx.quadraticCurveTo(x + 75, 336, x + 100, 366); ctx.fill();
    ctx.fillStyle = '#b5583a'; ctx.fillRect(x + 6, 320, 138, 24);
    ctx.fillStyle = '#5a2a14'; for (let i = 0; i < 8; i++) ctx.fillRect(x + 14 + i * 17, 326, 8, 14);
    curvedRoof(ctx, x + 75, 322, 150, 12, '#6b2f1f');
    ctx.fillStyle = '#b5583a'; ctx.fillRect(x + 55, 296, 40, 16);
    curvedRoof(ctx, x + 75, 300, 56, 12, '#6b2f1f');
    ctx.fillStyle = '#facc15'; ctx.font = '700 9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('来遠橋', x + 75, 305);
    label(ctx, 'Chùa Cầu', x + 75, 272);
  }
  function lanternStrings(ctx, cam, VW, t) {
    // dây đèn lồng giăng ngang phố (tọa độ thế giới)
    const P = 288;
    for (let x0 = Math.floor((cam - P) / P) * P; x0 < cam + VW + P; x0 += P) {
      ctx.strokeStyle = 'rgba(68,40,20,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, 24); ctx.quadraticCurveTo(x0 + P / 2, 64, x0 + P, 24); ctx.stroke();
      for (let i = 1; i < 6; i++) { const u = i / 6, x = x0 + u * P, y = 24 + 2 * (1 - u) * u * 40 + 14; lantern(ctx, x, y, lc(x0 / P + i), 8, t, i + x0); }
    }
  }
  function floatLanterns(ctx, VW, t) {
    for (let i = 0; i < 12; i++) {
      const x = ((hash(i) * VW + t * (6 + hash(i + 1) * 6)) % (VW + 40)) - 20, y = 378 + hash(i + 2) * 30;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 10); g.addColorStop(0, 'rgba(255,200,90,.95)'); g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = lc(i); ctx.fillRect(x - 3, y - 2, 6, 5);
    }
  }

  // ---------------- ĐÀ NẴNG: Cầu Rồng, sông Hàn, núi Sơn Trà ----------------
  function dragonBridge(ctx, x, t) {
    const deck = 360, len = 760;
    // mặt cầu và trụ
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(x, deck, len + 60, 7);
    ctx.fillStyle = '#6b7280'; for (let i = 0; i <= 6; i++) ctx.fillRect(x + 20 + i * 128, deck + 7, 10, 60);
    // thân rồng uốn lượn
    const yAt = (u) => deck - 6 - Math.abs(Math.sin(u * Math.PI * 4.5)) * 62;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 13; ctx.beginPath();
    for (let i = 0; i <= 90; i++) { const u = i / 90; const px = x + 30 + u * (len - 40), py = yAt(u); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 9; ctx.stroke();
    // vây lưng
    ctx.fillStyle = '#f59e0b';
    for (let i = 2; i < 88; i += 3) { const u = i / 90, px = x + 30 + u * (len - 40), py = yAt(u); ctx.beginPath(); ctx.moveTo(px - 3, py - 4); ctx.lineTo(px, py - 11); ctx.lineTo(px + 3, py - 4); ctx.fill(); }
    // đầu rồng
    const hx = x + len - 10, hy = deck - 34;
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx - 14, hy + 30); ctx.quadraticCurveTo(hx - 10, hy, hx + 8, hy - 6); ctx.lineTo(hx + 36, hy + 2); ctx.lineTo(hx + 30, hy + 10); ctx.lineTo(hx + 12, hy + 12); ctx.quadraticCurveTo(hx + 4, hy + 24, hx + 6, hy + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx + 2, hy - 2); ctx.lineTo(hx - 12, hy - 18); ctx.moveTo(hx + 10, hy - 4); ctx.lineTo(hx + 2, hy - 22); ctx.stroke();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(hx + 14, hy + 2, 2.5, 0, 7); ctx.fill();
    // phun lửa
    const fire = Math.sin(t * 0.8);
    if (fire > 0.55) {
      for (let i = 0; i < 14; i++) {
        const d = ((t * 90 + i * 9) % 120), fx = hx + 36 + d, fy = hy + 6 + Math.sin(i * 2.3 + t * 9) * d * 0.12, r = 4 + d * 0.12;
        ctx.globalAlpha = Math.max(0, 1 - d / 120); ctx.fillStyle = i % 3 ? '#fb923c' : '#fde047'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // đuôi
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 30, yAt(0)); ctx.quadraticCurveTo(x + 6, deck - 30, x + 14, deck - 46); ctx.stroke();
    ctx.lineCap = 'butt';
    label(ctx, 'Cầu Rồng', x + len / 2, deck - 96);
  }
  function palm(ctx, x, t, s) {
    ctx.strokeStyle = '#8b6b4a'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(x, GY); ctx.quadraticCurveTo(x + 20 * s, GY - 60 * s, x + 10 * s, GY - 120 * s); ctx.stroke();
    const tx = x + 10 * s, ty = GY - 120 * s;
    ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 5 * s;
    for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + Math.sin(t + i) * 0.05; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * 30 * s, ty + Math.sin(a) * 30 * s - 10 * s, tx + Math.cos(a) * 52 * s, ty + Math.sin(a) * 30 * s + 18 * s); ctx.stroke(); }
    ctx.fillStyle = '#7c5a2a'; ctx.beginPath(); ctx.arc(tx - 4, ty + 6, 4 * s, 0, 7); ctx.arc(tx + 5, ty + 7, 4 * s, 0, 7); ctx.fill();
  }

  // ---------------- SÀI GÒN: Landmark 81, Bitexco, cầu Ba Son ----------------
  function landmark81(ctx, x, t) {
    const base = 372;
    const tubes = [[-34, 14, 230], [-22, 14, 270], [-10, 16, 318], [6, 16, 300], [20, 14, 250], [32, 12, 200]];
    tubes.forEach(([dx, w, h], i) => {
      const g = ctx.createLinearGradient(x + dx, 0, x + dx + w, 0); g.addColorStop(0, '#8ea2d8'); g.addColorStop(1, '#3d4b8a');
      ctx.fillStyle = g; ctx.fillRect(x + dx, base - h, w, h);
      ctx.fillStyle = 'rgba(199,210,254,.55)'; for (let yy = base - h + 8; yy < base; yy += 9) ctx.fillRect(x + dx + 2, yy, w - 4, 1.5);
      if (i === 2) { ctx.fillStyle = '#3d4b8a'; ctx.beginPath(); ctx.moveTo(x + dx, base - h); ctx.lineTo(x + dx + w / 2, base - h - 26); ctx.lineTo(x + dx + w, base - h); ctx.fill(); }
    });
    ctx.strokeStyle = '#c7d2fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 2, base - 344); ctx.lineTo(x - 2, base - 372); ctx.stroke();
    if (Math.sin(t * 3) > 0) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x - 2, base - 373, 3, 0, 7); ctx.fill(); }
    label(ctx, 'Landmark 81', x + 78, base - 250);
  }
  function bitexco(ctx, x) {
    const base = 372, h = 190;
    ctx.fillStyle = '#7c8fc7'; ctx.beginPath(); ctx.moveTo(x - 16, base); ctx.quadraticCurveTo(x - 22, base - h * 0.6, x - 6, base - h); ctx.lineTo(x + 6, base - h); ctx.quadraticCurveTo(x + 22, base - h * 0.6, x + 16, base); ctx.fill();
    ctx.fillStyle = '#a5b4fc'; ctx.fillRect(x - 2, base - h + 10, 3, h - 12);
    ctx.fillStyle = '#5b6aa8'; ctx.beginPath(); ctx.ellipse(x + 14, base - h * 0.7, 14, 3.5, 0, 0, 7); ctx.fill();
    label(ctx, 'Bitexco', x, base - h - 16);
  }
  function skyline(ctx, cam, VW, t) {
    rep(ctx, cam, VW, 0.06, 64, 0, (x, n) => {
      const h = 50 + hash(n) * 110, w = 34 + hash(n + 1) * 26;
      ctx.fillStyle = '#2f2a62'; ctx.fillRect(x, 372 - h, w, h);
      ctx.fillStyle = '#ffd27a';
      for (let yy = 372 - h + 8; yy < 366; yy += 11) for (let xx = x + 5; xx < x + w - 6; xx += 9) if (hash(xx * 3 + yy) > 0.55) ctx.fillRect(xx, yy, 4, 5);
    });
  }
  function baSonBridge(ctx, x, t) {
    const deck = 370, len = 600, px = x + 220;
    ctx.fillStyle = '#d1d5db'; ctx.fillRect(x, deck, len, 6);
    // trụ tháp cao, hơi nghiêng
    const topX = px + 34, topY = 120;
    ctx.fillStyle = '#f3f4f6'; ctx.beginPath(); ctx.moveTo(px - 8, deck + 40); ctx.lineTo(px + 8, deck + 40); ctx.lineTo(topX + 3, topY); ctx.lineTo(topX - 3, topY); ctx.fill();
    ctx.strokeStyle = 'rgba(243,244,246,.75)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const u = 0.25 + i * 0.06, ax = px + (topX - px) * u, ay = deck - (deck - topY) * u;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px + 30 + i * 26, deck); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px - 20 - i * 14, deck); ctx.stroke();
    }
    ctx.fillStyle = '#fde68a'; for (let i = 0; i < len; i += 20) { ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i)); ctx.fillRect(x + i, deck - 3, 3, 3); } ctx.globalAlpha = 1;
    label(ctx, 'Cầu Ba Son', topX, topY - 16);
  }
  function motorbike(ctx, x, color) {
    const y = GY;
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(x + 6, y - 7, 7, 0, 7); ctx.arc(x + 38, y - 7, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(x + 6, y - 7, 3, 0, 7); ctx.arc(x + 38, y - 7, 3, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 4, y - 14); ctx.lineTo(x + 30, y - 14); ctx.lineTo(x + 38, y - 26); ctx.lineTo(x + 42, y - 26); ctx.lineTo(x + 38, y - 12); ctx.lineTo(x + 10, y - 8); ctx.fill();
    ctx.fillStyle = '#292524'; ctx.fillRect(x + 8, y - 20, 18, 5);
    ctx.strokeStyle = '#292524'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 38, y - 26); ctx.lineTo(x + 34, y - 34); ctx.stroke();
  }

  // ---------------- Ảnh nền vẽ tay ----------------
  // ground: dòng ảnh (tính theo pixel ảnh gốc) trùng với mặt đất của game (y = 416).
  function loadPhoto(src, groundY) {
    const o = { ok: false, img: new Image(), groundY };
    o.img.onload = () => { o.ok = true; };
    o.img.src = src;
    return o;
  }
  const PHOTO = { saigon: loadPhoto('img/treasure/bg-saigon.webp', 712) };
  function photoBack(ctx, ph, cam, VW, mapW) {
    if (!ph || !ph.ok) return false;
    const im = ph.img, iw0 = im.naturalWidth, ih0 = im.naturalHeight;
    let s = GY / ph.groundY;                       // dòng mặt đất của ảnh khớp mặt đất game
    if (ih0 * s < GY + 64) s = (GY + 64) / ih0;     // phủ kín chiều cao
    if (iw0 * s < VW + 2) s = (VW + 2) / iw0;       // màn hình rộng: phóng ảnh cho phủ kín chiều ngang
    const w = iw0 * s, h = ih0 * s, y = GY - ph.groundY * s;
    // ảnh trôi chậm (thị sai) và vừa khít từ đầu đến cuối màn, không lặp
    const span = Math.max(1, (mapW || 4000) - VW), k = Math.max(0, Math.min(1, (w - VW) / span));
    const x = -Math.min(cam * k, w - VW);
    ctx.fillStyle = '#9fd0f5'; ctx.fillRect(0, 0, VW + 2, GY + 70);
    ctx.drawImage(im, x, y, w, h);
    return true;
  }

  const SCENES = {
    hanoi: {
      ground: { body: '#b97a45', dot: '#a5683a', top: '#6cc04a', top2: '#58a83a' }, pit: '#6fb0cc',
      back(ctx, cam, VW, t) {
        ctx.fillStyle = grad(ctx, ['#bfe3f7', '#fff4dc'], 0, GY); ctx.fillRect(0, 0, VW + 2, GY + 70);
        clouds(ctx, cam, VW, 'rgba(255,255,255,.9)');
        rep(ctx, cam, VW, 0.08, 52, 0, (x, n) => { ctx.fillStyle = '#c9d8e6'; ctx.fillRect(x, 352 - hash(n) * 46, 40, 80); });
        water(ctx, VW, 362, '#7fb8cf');
        rep(ctx, cam, VW, 0.22, 1300, 420, (x) => turtleTower(ctx, x));
        rep(ctx, cam, VW, 0.22, 1300, 880, (x) => hucBridge(ctx, x, t));
        rep(ctx, cam, VW, 0.5, 520, 120, (x, n) => willow(ctx, x, t, 0.8 + hash(n) * 0.3));
      },
      decor(ctx, x, n) { lamp(ctx, x + 16, false); }
    },
    hoian: {
      ground: { body: '#c9955a', dot: '#b5824a', top: '#e8c07a', top2: '#c99a52', brick: true }, pit: '#2b3f6b',
      back(ctx, cam, VW, t) {
        ctx.fillStyle = grad(ctx, ['#26245a', '#6d3f86', '#f39a63'], 0, GY); ctx.fillRect(0, 0, VW + 2, GY + 70);
        stars(ctx, VW, t);
        ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(VW * 0.8, 70, 22, 0, 7); ctx.fill();
        hills(ctx, cam, VW, 0.06, 320, 50, '#4b3b72');
        water(ctx, VW, 364, '#2b3f6b', t, 'rgba(255,190,110,.4)');
        rep(ctx, cam, VW, 0.22, 110, 0, (x, n) => { if (n % 14 !== 6 && n % 14 !== 7) oldHouse(ctx, x, n, t); });
        rep(ctx, cam, VW, 0.22, 1540, 660, (x) => coveredBridge(ctx, x));
        floatLanterns(ctx, VW, t);
      },
      front(ctx, cam, VW, t) { lanternStrings(ctx, cam, VW, t); },
      decor(ctx, x, n) { lantern(ctx, x + 16, GY - 22, lc(n), 7, performance.now() / 1000, n); ctx.fillStyle = '#6b3a1f'; ctx.fillRect(x + 15, GY - 14, 2, 14); }
    },
    danang: {
      ground: { body: '#e2c27d', dot: '#d4b066', top: '#f6e3ad', top2: '#e8cf8c' }, pit: '#3a8fc9',
      back(ctx, cam, VW, t) {
        ctx.fillStyle = grad(ctx, ['#5bb8ef', '#dff4ff'], 0, GY); ctx.fillRect(0, 0, VW + 2, GY + 70);
        ctx.fillStyle = 'rgba(255,236,150,.9)'; ctx.beginPath(); ctx.arc(VW * 0.82, 64, 26, 0, 7); ctx.fill();
        clouds(ctx, cam, VW, 'rgba(255,255,255,.92)');
        hills(ctx, cam, VW, 0.05, 330, 90, '#8fb4c6');
        water(ctx, VW, 352, '#3a8fc9');
        rep(ctx, cam, VW, 0.24, 1500, 260, (x) => dragonBridge(ctx, x, t));
        rep(ctx, cam, VW, 0.5, 430, 60, (x, n) => palm(ctx, x, t, 0.8 + hash(n) * 0.3));
      },
      decor(ctx, x, n) {
        // dù đi biển
        ctx.strokeStyle = '#78716c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 16, GY); ctx.lineTo(x + 16, GY - 40); ctx.stroke();
        ctx.fillStyle = n % 2 ? '#ef4444' : '#3b82f6'; ctx.beginPath(); ctx.moveTo(x - 6, GY - 36); ctx.quadraticCurveTo(x + 16, GY - 60, x + 38, GY - 36); ctx.fill();
      }
    },
    saigon: {
      // Ảnh nền vẽ tay (img/treasure/bg-saigon.webp). Nếu ảnh chưa tải được thì vẽ cảnh đêm bằng code như cũ.
      get ground() { return PHOTO.saigon.ok ? { body: '#efb983', dot: '#dca06a', top: '#ddd3a6', top2: '#6f9a3e' } : { body: '#8b8f9a', dot: '#7a7e89', top: '#c7cad1', top2: '#a1a5ae', tile: true }; },
      get pit() { return PHOTO.saigon.ok ? '#6fb6ea' : '#273b74'; },
      back(ctx, cam, VW, t, mapW) {
        if (photoBack(ctx, PHOTO.saigon, cam, VW, mapW)) {
          // vài gợn sóng lấp lánh trên sông Sài Gòn
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 14; i++) { const x = (hash(i) * VW + t * 10 * (i % 2 ? 1 : -1)) % (VW + 30), y = 340 + hash(i + 5) * 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + hash(i + 2) * 12, y); ctx.stroke(); }
          return;
        }
        ctx.fillStyle = grad(ctx, ['#1c1a4a', '#4f3a8a', '#f29ab0'], 0, GY); ctx.fillRect(0, 0, VW + 2, GY + 70);
        stars(ctx, VW, t);
        skyline(ctx, cam, VW, t);
        rep(ctx, cam, VW, 0.14, 1900, 520, (x) => landmark81(ctx, x, t));
        rep(ctx, cam, VW, 0.14, 1900, 1240, (x) => bitexco(ctx, x));
        water(ctx, VW, 368, '#273b74', t, 'rgba(255,214,140,.45)');
        rep(ctx, cam, VW, 0.28, 1500, 900, (x) => baSonBridge(ctx, x, t));
        rep(ctx, cam, VW, 0.5, 300, 40, (x) => lamp(ctx, x, true));
      },
      decor(ctx, x, n) { motorbike(ctx, x - 4, ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'][n % 4]); }
    }
  };
  SCENES.pitWater = pitWater;
  SCENES.photo = PHOTO;
  window.SUMI_SCENES = SCENES;
})();
