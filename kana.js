// ===== Chuyển romaji → hiragana, katakana ↔ hiragana (dùng cho tìm kiếm & ô nhập đáp án) =====
(function () {
  const T = {
    a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
    ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
    sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ', za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
    ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と', da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
    na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
    ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ', pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
    ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も', ya: 'や', yu: 'ゆ', yo: 'よ',
    ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', la: 'ら', li: 'り', lu: 'る', le: 'れ', lo: 'ろ',
    wa: 'わ', wo: 'を', we: 'うぇ', wi: 'うぃ', nn: 'ん', "n'": 'ん', xn: 'ん',
    kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
    sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
    ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
    cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ',
    dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ', nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
    hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
    mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
    xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtu: 'っ', xtsu: 'っ', ltu: 'っ',
    '-': 'ー'
  };
  const MAXK = 4;

  // Chuyển chuỗi romaji (có thể lẫn kana) sang hiragana. final=true: chữ "n" cuối thành ん
  function toHiragana(input, final) {
    const s = String(input).toLowerCase();
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (!/[a-z'-]/.test(ch)) { out += ch; i++; continue; }
      // phụ âm đôi → っ
      if (i + 1 < s.length && ch === s[i + 1] && /[bcdfghjkmpqrstvwxyz]/.test(ch)) { out += 'っ'; i++; continue; }
      // n trước phụ âm (không phải y, n) → ん
      if (ch === 'n' && i + 1 < s.length && /[bcdfghjkmpqrstvwxz]/.test(s[i + 1])) { out += 'ん'; i++; continue; }
      let hit = false;
      for (let k = MAXK; k >= 1; k--) {
        const part = s.substr(i, k);
        if (T[part]) { out += T[part]; i += k; hit = true; break; }
      }
      if (!hit) {
        if (ch === 'n' && final && i === s.length - 1) { out += 'ん'; i++; continue; }
        out += ch; i++;
      }
    }
    return out;
  }
  const kataToHira = (s) => String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const hiraToKata = (s) => String(s).replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const isRomaji = (s) => /^[a-z' -]+$/i.test(s);

  // Gắn chuyển đổi trực tiếp vào ô nhập: gõ romaji → hiện hiragana
  function attach(input) {
    input.addEventListener('input', (e) => {
      if (e.isComposing) return;
      const v = input.value;
      const conv = toHiragana(v, false);
      if (conv !== v) {
        const pos = input.selectionStart, diff = conv.length - v.length;
        input.value = conv;
        try { input.setSelectionRange(pos + diff, pos + diff); } catch (err) { /* bỏ qua */ }
      }
    });
    input.addEventListener('blur', () => { input.value = toHiragana(input.value, true); });
  }

  window.SumiKana = { toHiragana, kataToHira, hiraToKata, isRomaji, attach };
})();
