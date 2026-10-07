/*! © 2026 Sumi Kanji */
// ===== Âm thanh cho game Săn cầu chữ: tự tổng hợp bằng Web Audio, không cần tệp âm thanh =====
window.HuntSFX = (function () {
  const KEY = 'sumiKanji.huntSound';
  let pref = { sfx: true, music: true };
  try { pref = Object.assign(pref, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* bỏ qua */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* bỏ qua */ } };
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = pref.sfx ? 0.8 : 0; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = pref.music ? 0.22 : 0; musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = () => ac.currentTime;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12); // số nốt MIDI → tần số

  // một nốt có bao âm (attack/decay)
  function tone(f, t, dur, o) {
    o = o || {};
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const v = o.vol == null ? 0.3 : o.vol, a = o.a || 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(t, dur, o) {
    o = o || {};
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.ftype || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 1200, t); if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur);
    const g = ac.createGain(); const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  const sparkle = (t, n, base, vol) => { for (let i = 0; i < n; i++) tone(hz(base + [0, 4, 7, 12, 16, 19, 24][i % 7]), t + i * 0.045, 0.25, { type: 'triangle', vol: vol || 0.12 }); };

  const S = {
    step(t) { noise(t, 0.06, { f: 2500 + Math.random() * 800, q: 2, vol: 0.035 }); },
    ping(t, lvl) { const f = [0, 1046, 1318, 1568][lvl] || 1046; tone(f, t, 0.18, { type: 'sine', vol: 0.12 }); tone(f * 2, t, 0.08, { type: 'sine', vol: 0.04 }); },
    encounter(t) { tone(hz(76), t, 0.12, { type: 'square', vol: 0.06 }); tone(hz(83), t + 0.08, 0.12, { type: 'square', vol: 0.06 }); sparkle(t + 0.16, 6, 84, 0.1); noise(t, 0.4, { f: 6000, fto: 2000, q: 0.7, vol: 0.06 }); },
    right(t, k) { const b = 72 + (k || 0) * 2; tone(hz(b), t, 0.14, { type: 'triangle', vol: 0.22 }); tone(hz(b + 7), t + 0.08, 0.16, { type: 'triangle', vol: 0.22 }); tone(hz(b + 12), t + 0.16, 0.3, { type: 'triangle', vol: 0.2 }); sparkle(t + 0.2, 3, b + 12, 0.07); },
    wrong(t) { tone(196, t, 0.18, { type: 'sawtooth', vol: 0.09, to: 150 }); tone(147, t + 0.16, 0.32, { type: 'sawtooth', vol: 0.09, to: 98 }); },
    flee(t) { tone(900, t, 0.5, { type: 'sine', vol: 0.12, to: 180 }); noise(t, 0.35, { f: 3000, fto: 600, vol: 0.06 }); },
    pop(t) { tone(500, t, 0.09, { type: 'sine', vol: 0.3, to: 1400, glide: 0.06 }); noise(t, 0.12, { f: 4000, q: 1.5, vol: 0.15 }); sparkle(t + 0.06, 4, 88, 0.06); },
    throw(t) { noise(t, 0.5, { f: 400, fto: 3000, q: 1.2, vol: 0.18, a: 0.2 }); tone(300, t, 0.4, { type: 'sine', vol: 0.05, to: 700 }); },
    hit(t) { tone(160, t, 0.18, { type: 'sine', vol: 0.4, to: 60 }); noise(t, 0.15, { f: 1800, q: 0.8, vol: 0.2 }); sparkle(t + 0.04, 5, 91, 0.08); },
    open(t) { tone(1200, t, 0.05, { type: 'square', vol: 0.05 }); tone(1800, t + 0.04, 0.06, { type: 'square', vol: 0.04 }); },
    suck(t) { tone(hz(60), t, 0.8, { type: 'sine', vol: 0.12, to: hz(96), glide: 0.75 }); tone(hz(67), t + 0.05, 0.75, { type: 'triangle', vol: 0.06, to: hz(103), glide: 0.7 }); noise(t, 0.8, { f: 800, fto: 7000, q: 3, vol: 0.06, a: 0.3 }); },
    close(t) { tone(900, t, 0.05, { type: 'square', vol: 0.06 }); tone(2400, t + 0.02, 0.2, { type: 'sine', vol: 0.08 }); },
    bounce(t, k) { tone(260 - (k || 0) * 40, t, 0.14, { type: 'sine', vol: 0.25 - (k || 0) * 0.08, to: 110 }); },
    wobble(t, k) { tone(700 + k * 120, t, 0.05, { type: 'square', vol: 0.05 }); noise(t, 0.08, { f: 1500, q: 4, vol: 0.06 }); tone(500 + k * 80, t + 0.18, 0.05, { type: 'square', vol: 0.04 }); },
    tick(t, k) { tone(hz(84 + k * 2), t, 0.12, { type: 'triangle', vol: 0.12 }); },
    success(t) {
      // kèn chiến thắng nhỏ: C E G C' + hợp âm
      [72, 76, 79].forEach((n, i) => tone(hz(n), t + i * 0.09, 0.16, { type: 'square', vol: 0.07 }));
      [84].forEach((n) => tone(hz(n), t + 0.27, 0.5, { type: 'square', vol: 0.07 }));
      [72, 76, 79, 84].forEach((n) => tone(hz(n), t + 0.27, 0.7, { type: 'triangle', vol: 0.1 }));
      tone(hz(48), t + 0.27, 0.6, { type: 'triangle', vol: 0.15 });
      sparkle(t + 0.3, 7, 96, 0.06); noise(t + 0.27, 0.6, { f: 8000, q: 0.5, vol: 0.05 });
    },
    fly(t) { tone(hz(79), t, 0.5, { type: 'sine', vol: 0.08, to: hz(91) }); },
    box(t) { tone(hz(88), t, 0.12, { type: 'square', vol: 0.06 }); tone(hz(95), t + 0.08, 0.35, { type: 'square', vol: 0.06 }); tone(220, t, 0.12, { type: 'sine', vol: 0.2, to: 120 }); },
    fresh(t) { [79, 83, 86, 91, 95].forEach((n, i) => tone(hz(n), t + i * 0.07, 0.3, { type: 'triangle', vol: 0.09 })); },
    boxopen(t) { noise(t, 0.25, { f: 500, fto: 900, q: 6, vol: 0.12 }); sparkle(t + 0.12, 5, 84, 0.07); },
    click(t) { tone(1500, t, 0.03, { type: 'square', vol: 0.04 }); },
    pew(t, lv) { const f = [880, 990, 1100, 1250, 700][lv || 0]; tone(f, t, 0.09, { type: lv >= 4 ? 'sawtooth' : 'square', vol: 0.035, to: f * 0.45 }); if (lv >= 4) tone(110, t, 0.12, { type: 'sine', vol: 0.12, to: 60 }); },
    coin(t) { tone(hz(88), t, 0.06, { type: 'square', vol: 0.05 }); tone(hz(93), t + 0.05, 0.16, { type: 'square', vol: 0.05 }); },
    mhit(t) { noise(t, 0.06, { f: 1200, q: 2, vol: 0.12 }); tone(300, t, 0.06, { type: 'square', vol: 0.05, to: 200 }); },
    mdie(t) { tone(400, t, 0.25, { type: 'sawtooth', vol: 0.07, to: 80 }); noise(t, 0.25, { f: 900, fto: 300, q: 1, vol: 0.16 }); sparkle(t + 0.1, 3, 86, 0.05); },
    hurt(t) { tone(220, t, 0.12, { type: 'square', vol: 0.12, to: 110 }); tone(140, t + 0.12, 0.35, { type: 'sawtooth', vol: 0.1, to: 60 }); noise(t, 0.3, { f: 600, q: 1, vol: 0.12 }); },
    bump(t) { tone(150, t, 0.1, { type: 'sine', vol: 0.3, to: 70 }); noise(t, 0.08, { f: 900, q: 2, vol: 0.12 }); },
    evolve(t) { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(hz(n), t + i * 0.06, 0.25, { type: 'square', vol: 0.05 })); tone(hz(48), t, 0.8, { type: 'sine', vol: 0.15, to: hz(72) }); sparkle(t + 0.4, 7, 96, 0.06); },
    life(t) { [76, 79, 84, 88].forEach((n, i) => tone(hz(n), t + i * 0.08, 0.2, { type: 'triangle', vol: 0.12 })); },
    gameover(t) { [67, 64, 60, 55].forEach((n, i) => tone(hz(n), t + i * 0.22, 0.3, { type: 'triangle', vol: 0.14 })); tone(hz(43), t + 0.9, 0.9, { type: 'sine', vol: 0.15 }); }
  };
  function play(name, arg, delay) {
    if (!ac || !pref.sfx || !S[name]) return;
    try { S[name](now() + (delay || 0), arg); } catch (e) { /* bỏ qua */ }
  }

  // ---------- Nhạc nền: giai điệu ngũ cung nhẹ nhàng, lặp 8 ô nhịp ----------
  const BPM = 104, BEAT = 60 / BPM;
  // mỗi phần tử: [nốt MIDI hoặc 0 = nghỉ, số phách]
  const MEL = [[76, 1], [79, 0.5], [81, 0.5], [79, 1], [76, 1], [74, 1], [76, 0.5], [74, 0.5], [72, 2],
    [74, 1], [76, 1], [79, 1], [81, 1], [84, 1.5], [81, 0.5], [79, 2],
    [81, 1], [79, 0.5], [76, 0.5], [74, 1], [76, 1], [79, 1], [76, 0.5], [74, 0.5], [72, 2],
    [69, 1], [72, 1], [74, 1], [76, 0.5], [79, 0.5], [76, 1], [74, 1], [72, 2]];
  const BASS = [48, 45, 41, 43, 48, 45, 41, 43];
  let musOn = false, nextT = 0, mi = 0, beatPos = 0, bar = 0, timer = null, duck = 1;
  function schedule() {
    while (nextT < now() + 0.25) {
      const [n, len] = MEL[mi];
      if (n) { tone(hz(n), nextT, len * BEAT * 0.9, { type: 'triangle', vol: 0.18 * duck, bus: musBus, a: 0.01 }); tone(hz(n + 12), nextT, len * BEAT * 0.5, { type: 'sine', vol: 0.04 * duck, bus: musBus }); }
      // bè trầm + tiếng gõ nhẹ ở đầu mỗi phách
      for (let b = Math.ceil(beatPos - 1e-6); b < beatPos + len - 1e-6; b++) {
        const tb = nextT + (b - beatPos) * BEAT;
        if (b % 4 === 0) { bar = Math.floor(b / 4) % 8; tone(hz(BASS[bar]), tb, BEAT * 1.8, { type: 'sine', vol: 0.22 * duck, bus: musBus }); }
        if (b % 2 === 1) tone(hz(BASS[bar] + 7), tb, BEAT * 0.8, { type: 'sine', vol: 0.12 * duck, bus: musBus });
        noise(tb, 0.04, { f: 7000, q: 1, vol: (b % 2 ? 0.03 : 0.05) * duck, bus: musBus });
      }
      nextT += len * BEAT; beatPos += len; mi = (mi + 1) % MEL.length;
      if (mi === 0) beatPos = 0;
    }
  }
  function musicStart() {
    if (!ac || musOn) return;
    musOn = true; nextT = now() + 0.1; mi = 0; beatPos = 0;
    timer = setInterval(schedule, 90); schedule();
  }
  function musicStop() { musOn = false; clearInterval(timer); }
  // nhạc nhỏ lại khi đang trả lời câu hỏi
  function setDuck(v) { duck = v; if (musBus && pref.music) musBus.gain.setTargetAtTime(0.22 * v, now(), 0.2); }

  function toggle(which) {
    pref[which] = !pref[which]; save();
    if (ac) {
      if (which === 'sfx') sfxBus.gain.setTargetAtTime(pref.sfx ? 0.8 : 0, now(), 0.05);
      if (which === 'music') musBus.gain.setTargetAtTime(pref.music ? 0.22 * duck : 0, now(), 0.1);
    }
    return pref[which];
  }
  return { init, play, musicStart, musicStop, setDuck, toggle, pref: () => pref, ready: () => !!ac };
})();
