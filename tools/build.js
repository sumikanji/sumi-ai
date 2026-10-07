/*! © 2026 Sumi Kanji */
// Đóng gói Sumi Kanji để đưa lên mạng: nén + làm rối mã → thư mục dist/
//   npm install        (chỉ lần đầu)
//   npm run build      → upload thư mục dist/ lên hosting
// Bản gốc (dễ đọc) giữ lại trên máy bạn, KHÔNG upload.
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const Obf = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const { minify: minHtml } = require('html-minifier-terser');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const BANNER = '/*! © ' + new Date().getFullYear() + ' Sumi Kanji — All rights reserved. Unauthorized copying is prohibited. */\n';
const SKIP = new Set(['dist', 'tools', 'node_modules', 'package.json', 'package-lock.json', '.git']);
const KEEP_PLAIN = new Set(['firebase-config.js']); // để dễ sửa cấu hình trên hosting

const OBF = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,          // các file dùng chung biến toàn cục (HIYO, LEVELS…) → giữ tên
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  splitStrings: false,
  controlFlowFlattening: false,  // tắt để trang vẫn chạy nhanh
  deadCodeInjection: false,
  selfDefending: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (SKIP.has(d.name) || d.name.startsWith('.')) return [];
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  let n = 0, before = 0, after = 0;
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const src = fs.readFileSync(file);
    let out = src;
    const ext = path.extname(file);
    if (ext === '.md') continue; // tài liệu hướng dẫn không upload
    if (rel.startsWith('vendor' + path.sep)) { /* thư viện bên ngoài (three.js – MIT): giữ nguyên */ }
    else if (ext === '.js' && !KEEP_PLAIN.has(path.basename(file))) {
      const code = src.toString();
      const isData = rel.startsWith('data' + path.sep) || code.length > 300000;
      const m = await minify(code, { compress: !isData, mangle: !isData, format: { comments: false } });
      out = isData ? BANNER + m.code : BANNER + Obf.obfuscate(m.code, OBF).getObfuscatedCode();
    } else if (ext === '.css') {
      out = BANNER + new CleanCSS({ level: 1 }).minify(src.toString()).styles;
    } else if (ext === '.html') {
      out = '<!-- © Sumi Kanji. All rights reserved. -->' + await minHtml(src.toString(), {
        collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: true, keepClosingSlash: true
      });
    }
    fs.writeFileSync(dest, out);
    n++; before += src.length; after += Buffer.byteLength(out);
    process.stdout.write('\r' + n + ' file…');
  }
  console.log('\n✅ Xong: ' + n + ' file → dist/  (' + (before / 1048576).toFixed(1) + ' MB → ' + (after / 1048576).toFixed(1) + ' MB)');
})().catch((e) => { console.error('❌', e); process.exit(1); });
