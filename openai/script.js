'use strict';

// all of the functions on this script are extracted from the original openai script

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

const config = [
  3e3, new Date().toString(), null, Math.random(),
  USER_AGENT, null, '', 'en-US',
  'en-US,en', Math.random(), null, null,
  'prompt', performance.now(), '', '',
  8, performance.timeOrigin
];

module.exports = async function (t, n) {
  const s = performance.now();
  let a = null;
  for (let i = 0; i < 5e5; i++) {
    (!a || a.timeRemaining() <= 0) && (a = await koe());
    const l = runCheck(s, t, n, config, i);
    if (l)
      return 'gAAAAAB'+l;
  }
};

function moe(e) {
  return setTimeout(() => e({ timeRemaining: () => 1, didTimeout: !1 }), 0);
}

function koe() {
  return new Promise(e => moe(n => e(n), { timeout: 10 }));
}

function boe(e) {
  let t = 2166136261;
  for (let n = 0; n < e.length; n++) 
    t ^= e.charCodeAt(n),
    t = Math.imul(t, 16777619) >>> 0;
  return t ^= t >>> 16,
          t = Math.imul(t, 2246822507) >>> 0,
          t ^= t >>> 13,
          t = Math.imul(t, 3266489909) >>> 0,
          t ^= t >>> 16,
          (t >>> 0).toString(16).padStart(8, "0");
}

function rf(e) {
  return e = JSON.stringify(e), btoa(unescape(encodeURIComponent(e)));
}

function runCheck (t, n, s, a, o) {
  a[3] = o, a[9] = Math.round(70057 - t);
  const i = rf(a);
  return boe(n + i).substring(0, s.length) <= s ? i + "~S" : null;
}