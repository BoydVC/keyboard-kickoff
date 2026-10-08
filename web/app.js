/* Keyboard Kickoff: sports-themed touch-typing trainer. Fully offline, no network. */
(function () {
"use strict";
const W = window.KK_WORDS;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const params = new URLSearchParams(location.search);
const DRILL_SECONDS = Math.max(5, +params.get("drill") || 120);
const FAST = params.has("fast");
const ANIM = FAST ? 200 : 1150;
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- players & storage ---------------- */
const PLAYERS = {
  char: { name: "Char", full: "Charlotte", color: "#8b5cf6", num: "13", tag: "U14 striker · 8th grade", target: 22, level: "char" },
  vic: { name: "Vic", full: "Victor", color: "#f97316", num: "11", tag: "12U soccer & 11U baseball · 6th grade", target: 16, level: "vic" },
  guest: { name: "Guest", full: "Guest", color: "#14b8a6", num: "G", tag: "Anyone can play", target: 18, level: "guest" },
};
const KEY = "keyboard-kickoff-v1";
const blankProfile = () => ({ sessions: [], keyErr: {}, keyHits: {}, best: { wpm: 0, acc: 0, pk: 0, hr: 0, hrLong: 0, drill: 0 }, lessons: {}, badges: [], days: [], words: 0 });
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.profiles) { for (const id in PLAYERS) { s.profiles[id] = Object.assign(blankProfile(), s.profiles[id] || {}); s.profiles[id].best = Object.assign(blankProfile().best, s.profiles[id].best); } if (!PLAYERS[s.current]) s.current = "char"; return s; }
  } catch (e) { /* fresh start */ }
  const s = { current: "char", profiles: {}, sound: true };
  for (const id in PLAYERS) s.profiles[id] = blankProfile();
  return s;
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } };
const P = () => S.profiles[S.current];
const PL = () => PLAYERS[S.current];
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function streak(p) {
  const set = new Set(p.days); let n = 0; const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  for (;;) { const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (set.has(k)) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}

/* ---------------- keyboard model ---------------- */
const ROWS = [
  [["`", "~"], ["1", "!"], ["2", "@"], ["3", "#"], ["4", "$"], ["5", "%"], ["6", "^"], ["7", "&"], ["8", "*"], ["9", "("], ["0", ")"], ["-", "_"], ["=", "+"], { id: "Backspace", label: "⌫", w: 2 }],
  [{ id: "Tab", label: "tab", w: 1.5 }, ..."qwertyuiop".split("").map((c) => [c]), ["[", "{"], ["]", "}"], { id: "\\", label: "\\", shift: "|", w: 1.5 }],
  [{ id: "Caps", label: "caps", w: 1.75 }, ..."asdfghjkl".split("").map((c) => [c]), [";", ":"], ["'", '"'], { id: "Enter", label: "enter", w: 2.25 }],
  [{ id: "ShiftL", label: "shift", w: 2.25 }, ..."zxcvbnm".split("").map((c) => [c]), [",", "<"], [".", ">"], ["/", "?"], { id: "ShiftR", label: "shift", w: 2.75 }],
  [{ id: "gap1", label: "", w: 4, ghost: true }, { id: " ", label: "space", w: 7 }, { id: "gap2", label: "", w: 4, ghost: true }],
];
const FINGERS = {
  LP: { name: "left pinky", color: "#f472b6" }, LR: { name: "left ring finger", color: "#fb923c" }, LM: { name: "left middle finger", color: "#facc15" }, LI: { name: "left index finger", color: "#4ade80" },
  RI: { name: "right index finger", color: "#38bdf8" }, RM: { name: "right middle finger", color: "#facc15" }, RR: { name: "right ring finger", color: "#fb923c" }, RP: { name: "right pinky", color: "#f472b6" }, TH: { name: "thumb", color: "#a78bfa" },
};
const FMAP = {};
[["LP", "`1qaz", ["Tab", "Caps", "ShiftL"]], ["LR", "2wsx"], ["LM", "3edc"], ["LI", "45rtfgvb"], ["RI", "67yuhjnm"], ["RM", "8ik,"], ["RR", "9ol."], ["RP", "0-=p[]\\;'/", ["Enter", "ShiftR", "Backspace"]], ["TH", " "]]
  .forEach(([f, chars, extra]) => { chars.split("").forEach((c) => (FMAP[c] = f)); (extra || []).forEach((c) => (FMAP[c] = f)); });
const SHIFTED = {};
ROWS.flat().forEach((k) => { if (Array.isArray(k) && k[1]) SHIFTED[k[1]] = k[0]; if (k.shift) SHIFTED[k.shift] = k.id; });
function baseKey(ch) { if (ch == null) return null; if (/[A-Z]/.test(ch)) return ch.toLowerCase(); if (SHIFTED[ch]) return SHIFTED[ch]; return ch; }
function needsShift(ch) { return /[A-Z]/.test(ch) || !!SHIFTED[ch]; }
const isLeft = (f) => f && f[0] === "L";
function keyInfo(ch) {
  const k = baseKey(ch); const f = FMAP[k] || "TH"; let shift = null;
  if (needsShift(ch)) shift = isLeft(f) ? "ShiftR" : "ShiftL";
  return { k, f, shift };
}
function kbHTML(small) {
  return `<div class="kb${small ? " kb-sm" : ""}" aria-hidden="true">` + ROWS.map((row) => `<div class="kr">` + row.map((k) => {
    const id = Array.isArray(k) ? k[0] : k.id, w = Array.isArray(k) ? 1 : k.w, f = FMAP[id];
    const lab = Array.isArray(k) ? (/[a-z]/.test(k[0]) ? k[0].toUpperCase() : (k[1] ? `<sup>${esc(k[1])}</sup>${esc(k[0])}` : esc(k[0]))) : esc(k.label);
    return `<div class="key${k.ghost ? " ghost" : ""}${id === "f" || id === "j" ? " bump" : ""}" data-k="${esc(id)}" style="--w:${w};--fc:${f ? FINGERS[f].color : "#64748b"}">${lab}</div>`;
  }).join("") + `</div>`).join("") + `</div>`;
}
function kbHighlight(ch, root = document) {
  $$(".key.next, .key.next-shift", root).forEach((e) => e.classList.remove("next", "next-shift"));
  const hint = $(".finger-hint", root);
  if (ch == null) { if (hint) hint.innerHTML = "&nbsp;"; return; }
  const { k, f, shift } = keyInfo(ch);
  const el = $(`.key[data-k="${CSS.escape(k)}"]`, root); if (el) el.classList.add("next");
  if (shift) { const s = $(`.key[data-k="${shift}"]`, root); if (s) s.classList.add("next-shift"); }
  if (hint) {
    const label = ch === " " ? "Space" : ch;
    hint.innerHTML = `Next: <b class="kcap">${esc(label)}</b> with your <b style="color:${FINGERS[f].color}">${FINGERS[f].name}</b>` +
      (shift ? ` &nbsp;+&nbsp; <b style="color:${FINGERS[isLeft(f) ? "RP" : "LP"].color}">${isLeft(f) ? "right" : "left"} pinky</b> on Shift` : "");
  }
}
function kbHeat(root, errs, hits) {
  $$(".key", root).forEach((el) => {
    const k = el.dataset.k, e = errs[k] || 0, h = hits[k] || 0;
    if (!h) { el.style.removeProperty("--heat"); el.removeAttribute("title"); return; }
    const rate = e / h; el.style.setProperty("--heat", clamp(rate * 4, 0.08, 1).toFixed(2));
    el.classList.toggle("hot", e > 0); el.title = `${k === " " ? "space" : k}: ${e} slip${e === 1 ? "" : "s"} in ${h}`;
  });
}

/* ---------------- lessons ---------------- */
const ALL_BANK = Array.from(new Set([...W.sports, ...W.school].filter((w) => !w.includes(" "))));
const onlyKeys = (word, set) => word.split("").every((c) => set.includes(c));
const takeWords = (list, n) => { const out = []; let pool = shuffle(list); while (out.length < n) { if (!pool.length) pool = shuffle(list); out.push(pool.pop()); } return out.join(" "); };
const HOME = "asdfghjkl;", TOP = "qwertyuiop", BOT = "zxcvbnm,./";
const LESSONS = [
  { id: "h1", stage: "Home Row", icon: "🏠", title: "Home Row Warmup", keys: HOME, gen: () => "asdf jkl; asdf jkl; fj fj dk dk sl sl a; a; gh hg fgf jhj sad lad fall" },
  { id: "h2", stage: "Home Row", icon: "🏠", title: "Home Row Words", keys: HOME, gen: () => takeWords(W.homeRow, 12) },
  { id: "t1", stage: "Top Row", icon: "⬆️", title: "Reach Up", keys: TOP, gen: () => "frf juj ded kik sws lol aqa ;p; ftf jyj qwert yuiop type your quiet power" },
  { id: "t2", stage: "Top Row", icon: "⬆️", title: "Top Row Words", keys: TOP, gen: () => takeWords(ALL_BANK.filter((w) => onlyKeys(w, HOME + TOP)), 12) },
  { id: "b1", stage: "Bottom Row", icon: "⬇️", title: "Reach Down", keys: BOT, gen: () => "fvf jmj dcd k,k sxs l.l aza fbf jnj zxcvb nm,./ mix bench box zoom" },
  { id: "b2", stage: "Bottom Row", icon: "⬇️", title: "All-Letter Words", keys: BOT, gen: () => takeWords(ALL_BANK.filter((w) => /[zxcvbnm]/.test(w)), 12) },
  { id: "n1", stage: "Numbers", icon: "🔢", title: "Number Row", keys: "1234567890", gen: () => "1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 10 20 30 11 22 33" },
  { id: "n2", stage: "Numbers", icon: "🔢", title: "Numbers in Play", keys: "1234567890", gen: () => shuffle(W.numbers).slice(0, 4).join(", ") },
  { id: "c1", stage: "Capitals & Punctuation", icon: "🔠", title: "Capital Teams", keys: "ABC!?,.", gen: () => shuffle(W.teams).slice(0, 6).join(", ") + ". Go! Yes? Wow!" },
  { id: "c2", stage: "Capitals & Punctuation", icon: "🔠", title: "Cheers & Questions", keys: "!?\",;", gen: () => shuffle(W.capsPunct).slice(0, 3).join(" ") },
  { id: "s1", stage: "Full Sentences", icon: "📝", title: "Game-Day Sentences", keys: "all", gen: () => sentences(2) },
  { id: "s2", stage: "Full Sentences", icon: "📝", title: "Championship Sentences", keys: "all", gen: () => sentences(3) },
];
function sentences(n) { const lv = PL().level === "guest" ? rand(["vic", "char"]) : PL().level; return shuffle(W.sentences[lv]).slice(0, n).join(" "); }
function gameWords(n) {
  const lv = PL().level, out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const list = lv === "vic" ? (r < 0.65 ? W.short : W.medium) : lv === "char" ? (r < 0.25 ? W.short : r < 0.65 ? W.medium : W.long) : (r < 0.4 ? W.short : r < 0.8 ? W.medium : W.long);
    let w; do { w = rand(list); } while (out.includes(w) && out.length < 40);
    out.push(w);
  }
  return out;
}

/* ---------------- sound (WebAudio, created on first key/click) ---------------- */
let AC = null;
function sound(kind) {
  if (!S.sound) return;
  try {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
    if (AC.state === "suspended") AC.resume();
    const tones = { err: [[180, 0.08]], ok: [[660, 0.05]], goal: [[523, 0.1], [659, 0.1], [784, 0.18]], miss: [[300, 0.12], [220, 0.16]], hit: [[880, 0.06], [1175, 0.12]], td: [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]] }[kind] || [];
    let t = AC.currentTime;
    tones.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = kind === "err" ? "square" : "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9; });
  } catch (e) { /* audio is optional */ }
}

/* ---------------- typing engine ---------------- */
let sess = null, typer = null, screen = "home", lastResult = null, timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function clearTimers() { timers.forEach(clearTimeout); timers = []; if (drillTick) { clearInterval(drillTick); drillTick = null; } }
function newSess(mode, label) { sess = { mode, label, correct: 0, errors: 0, keyErr: {}, hits: {}, ms: 0, wpmChars: 0, words: 0, extra: {} }; }
class Typer {
  constructor(text, el, hooks = {}) { this.text = text; this.pos = 0; this.errors = 0; this.errAt = {}; this.t0 = 0; this.t1 = 0; this.el = el; this.hooks = hooks; this.wrong = false; this.shownAt = performance.now(); this.render(); }
  expected() { return this.pos < this.text.length ? this.text[this.pos] : null; }
  key(ch) {
    const exp = this.expected(); if (exp == null) return;
    const now = performance.now(); if (!this.t0) { this.t0 = now; this.hooks.first && this.hooks.first(this); }
    const k = baseKey(exp); sess.hits[k] = (sess.hits[k] || 0) + 1;
    if (ch === exp) {
      this.pos++; sess.correct++; this.wrong = false;
      if (this.pos >= this.text.length) { this.t1 = now; this.render(); typer = null; kbHighlight(null); this.hooks.done && this.hooks.done(this); return; }
    } else {
      this.errors++; sess.errors++; sess.keyErr[k] = (sess.keyErr[k] || 0) + 1; this.errAt[this.pos] = 1; this.wrong = true; sound("err");
      if (this.el) { this.el.classList.remove("shake"); void this.el.offsetWidth; this.el.classList.add("shake"); }
      this.hooks.error && this.hooks.error(this);
    }
    this.render(); this.hooks.progress && this.hooks.progress(this);
  }
  render() {
    if (!this.el) return;
    let h = "";
    for (let i = 0; i < this.text.length; i++) {
      const c = this.text[i], cls = i < this.pos ? (this.errAt[i] ? "fx" : "ok") : i === this.pos ? "cur" + (this.wrong ? " bad" : "") + (c === " " ? " sp" : "") : "todo";
      h += `<span class="${cls}">${c === " " ? " " : esc(c)}</span>`;
    }
    this.el.innerHTML = h; kbHighlight(this.expected());
  }
}
function wordWPM(t) { const ms = Math.max(250, t.t1 - t.shownAt); return ((t.text.length + 1) / 5) / (ms / 60000); }
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && screen !== "home" && screen !== "results") { e.preventDefault(); clearTimers(); typer = null; renderHome(); return; }
  if (!typer || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) { if (e.key === "Backspace" || e.key === "Tab") e.preventDefault(); return; }
  e.preventDefault(); if (e.repeat) return;
  typer.key(e.key);
});

/* ---------------- shell / navigation ---------------- */
const view = () => $("#view");
function setScreen(name) {
  screen = name; document.body.dataset.screen = name;
  $$(".nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === name || (name.startsWith("lesson") && b.dataset.go === "lessons")));
  const p = PL(); $("#chip").innerHTML = `${jersey(S.current, 30)}<span>${esc(p.name)}</span>`; document.documentElement.style.setProperty("--pc", p.color);
}
function jersey(id, size = 64) {
  const p = PLAYERS[id];
  return `<svg class="jersey" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 6 L10 10 L2 22 L11 28 L14 24 L14 58 L50 58 L50 24 L53 28 L62 22 L54 10 L44 6 Q32 14 20 6Z" fill="${p.color}" stroke="rgba(0,0,0,.35)" stroke-width="2"/><path d="M20 6 Q32 14 44 6" fill="none" stroke="#fff" stroke-width="3"/><text x="32" y="45" text-anchor="middle" font-size="${p.num.length > 1 ? 20 : 22}" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">${p.num}</text></svg>`;
}
function stat(label, value, sub) { return `<div class="stat"><div class="sv">${value}</div><div class="sl">${label}</div>${sub ? `<div class="ss">${sub}</div>` : ""}</div>`; }
function avgAcc(p) { const s = p.sessions.slice(-10); return s.length ? Math.round(s.reduce((a, x) => a + x.acc, 0) / s.length) : 0; }

function renderHome() {
  clearTimers(); typer = null; setScreen("home");
  const p = P(), pl = PL(), done = LESSONS.filter((l) => p.lessons[l.id]).length;
  const next = LESSONS.find((l) => !p.lessons[l.id]) || LESSONS[LESSONS.length - 1];
  view().innerHTML = `
  <section class="home">
    <div class="hero card">
      <div class="hero-top"><div><h1>Keyboard <span>Kickoff</span></h1><p class="lede">Touch-typing practice with a game-day twist. Pick your player, warm up on the lesson path, then take the field.</p></div>
      <div class="ball-anim">${heroArt()}</div></div>
      <div class="players">${Object.keys(PLAYERS).map((id) => { const q = S.profiles[id], P2 = PLAYERS[id]; return `
        <button class="player${id === S.current ? " sel" : ""}" data-player="${id}" style="--c:${P2.color}">${jersey(id, 56)}<div><b>${P2.name}</b><small>${P2.tag}</small><small class="pb">Best ${Math.round(q.best.wpm)} WPM · ${q.badges.length} badges</small></div></button>`; }).join("")}
      </div>
    </div>
    <div class="side card">
      <div class="side-h">${jersey(S.current, 44)}<div><h2>${esc(pl.full)}'s Locker</h2><small>${streak(p) ? `🔥 ${streak(p)}-day streak` : "Start a streak today!"}</small></div></div>
      <div class="stats">${stat("Best WPM", Math.round(p.best.wpm))}${stat("Avg accuracy", avgAcc(p) + "%")}${stat("Lessons", done + "/" + LESSONS.length)}${stat("Badges", p.badges.length)}</div>
      <button class="btn big" id="go-next">${next.icon} ${p.lessons[next.id] ? "Replay" : "Next up"}: ${esc(next.title)}</button>
      <div class="mini-badges">${p.badges.slice(-6).map((b) => { const B = BADGES.find((x) => x[0] === b); return B ? `<span title="${esc(B[2])}">${B[1]}</span>` : ""; }).join("") || "<em>Badges you earn show up here.</em>"}</div>
    </div>
    <div class="modes">
      ${modeCard("lessons", "🗺️", "Lesson Path", "Home row → top → bottom → numbers → capitals → sentences.", "#22c55e")}
      ${modeCard("pk", "⚽", "Penalty Kick", "Type the word fast and clean to beat the keeper. 8 kicks.", "#38bdf8")}
      ${modeCard("hr", "⚾", "Home Run Derby", "Every clean word is a hit. Speed + accuracy = distance. 10 pitches.", "#f59e0b")}
      ${modeCard("drill", "🏈", "Two-Minute Drill", "Beat the clock and drive down the field for touchdowns.", "#a855f7")}
      ${modeCard("practice", "🧘", "Practice", "Calm mode. No clock, no pressure, just smooth typing.", "#14b8a6")}
    </div>
  </section>`;
  $$(".player").forEach((b) => (b.onclick = () => { S.current = b.dataset.player; save(); renderHome(); }));
  $$(".mode").forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $("#go-next").onclick = () => startLesson(next.id);
}
function modeCard(go, icon, title, desc, c) { return `<button class="mode card" data-go="${go}" style="--c:${c}"><span class="mi">${icon}</span><b>${title}</b><small>${desc}</small></button>`; }
function heroArt() {
  return `<svg viewBox="0 0 220 140" width="220" height="140" aria-hidden="true"><defs><linearGradient id="kg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>
  ${["K", "I", "C", "K"].map((l, i) => `<g transform="translate(${10 + i * 50},${70 + (i % 2) * 6})"><rect width="44" height="44" rx="9" fill="url(#kg)" stroke="${["#f472b6", "#fb923c", "#4ade80", "#38bdf8"][i]}" stroke-width="3"/><text x="22" y="30" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="system-ui">${l}</text></g>`).join("")}
  <g class="hero-ball"><circle cx="0" cy="0" r="20" fill="#fff" stroke="#0f172a" stroke-width="2"/><path d="M0 -8 L7.6 -2.5 L4.7 6.5 L-4.7 6.5 L-7.6 -2.5Z" fill="#0f172a"/><path d="M0 -8 L0 -20 M7.6 -2.5 L19 -6 M4.7 6.5 L11.7 16 M-4.7 6.5 L-11.7 16 M-7.6 -2.5 L-19 -6" stroke="#0f172a" stroke-width="2"/></g></svg>`;
}
function go(name) {
  if (name === "home") renderHome(); else if (name === "lessons") renderLessons(); else if (name === "pk") startPK(); else if (name === "hr") startHR();
  else if (name === "drill") startDrill(); else if (name === "practice") renderPracticePick(); else if (name === "board") renderBoard(); else if (name === "locker") renderLocker();
}

/* ---------------- lesson path ---------------- */
function renderLessons() {
  clearTimers(); typer = null; setScreen("lessons");
  const p = P(); let stage = "";
  view().innerHTML = `<section class="card path"><h2>🗺️ ${esc(PL().name)}'s Lesson Path</h2><p class="muted">Finish a lesson to earn stars. ⭐ finish · ⭐⭐ 90%+ accuracy · ⭐⭐⭐ 96%+ accuracy and ${PL().target}+ WPM. Every lesson is always open, so replay any time.</p>
  <div class="stages">${LESSONS.map((l, i) => { let h = ""; if (l.stage !== stage) { if (stage) h += `</div></div>`; stage = l.stage; h += `<div class="stage"><div class="stage-h">${l.icon} ${esc(l.stage)}</div><div class="stage-l">`; }
    const r = p.lessons[l.id]; h += `<button class="lesson-btn${r ? " done" : ""}" data-lesson="${l.id}"><span class="ln">${i + 1}</span><b>${esc(l.title)}</b><span class="stars">${[1, 2, 3].map((s) => `<i class="${r && r.stars >= s ? "on" : ""}">★</i>`).join("")}</span>${r ? `<small>${Math.round(r.wpm)} WPM · ${Math.round(r.acc)}%</small>` : `<small>Keys: ${esc(l.keys)}</small>`}</button>`;
    if (i === LESSONS.length - 1) h += `</div></div>`; return h; }).join("")}</div></section>`;
  $$(".lesson-btn").forEach((b) => (b.onclick = () => startLesson(b.dataset.lesson)));
}
function typingScreen(title, sub, extraTop = "") {
  return `<section class="typing card">
    <div class="ty-head"><div><h2>${title}</h2><small class="muted">${sub}</small></div>
      <div class="live"><span><b id="lv-wpm">0</b> WPM</span><span><b id="lv-acc">100</b>% accuracy</span><span><b id="lv-err">0</b> slips</span></div></div>
    ${extraTop}
    <div class="prog"><i id="prog"></i></div>
    <div class="ty-text" id="ty-text"></div>
    <div class="finger-hint">&nbsp;</div>
    ${kbHTML(false)}
    <div class="legend">${["LP", "LR", "LM", "LI", "RI", "TH"].map((f) => `<span><i style="background:${FINGERS[f].color}"></i>${f === "LP" ? "pinkies" : f === "LR" ? "ring" : f === "LM" ? "middle" : f === "LI" ? "left index" : f === "RI" ? "right index" : "thumbs"}</span>`).join("")}<span class="muted">Esc = back to menu</span></div>
  </section>`;
}
function liveUpdate(t, total, done) {
  const acc = sess.correct + sess.errors ? (100 * sess.correct) / (sess.correct + sess.errors) : 100;
  const ms = t && t.t0 ? performance.now() - t.t0 + (sess.ms || 0) : sess.ms;
  const wpm = ms > 1500 ? (sess.correct / 5) / (ms / 60000) : 0;
  const a = $("#lv-wpm"); if (a) { a.textContent = Math.round(wpm); $("#lv-acc").textContent = Math.round(acc); $("#lv-err").textContent = sess.errors; }
  const pr = $("#prog"); if (pr && total) pr.style.width = (100 * done / total).toFixed(1) + "%";
}
function startLesson(id) {
  clearTimers(); const l = LESSONS.find((x) => x.id === id); setScreen("lesson-" + id); newSess("lesson", l.title); sess.extra.lesson = id;
  const text = l.gen();
  view().innerHTML = typingScreen(`${l.icon} ${esc(l.title)}`, `${esc(l.stage)} · Lesson ${LESSONS.indexOf(l) + 1} of ${LESSONS.length} · eyes on the screen, fingers on the home row (F and J have bumps)`);
  typer = new Typer(text, $("#ty-text"), {
    progress: (t) => liveUpdate(t, t.text.length, t.pos),
    done: (t) => { sess.ms = t.t1 - t.t0; sess.wpmChars = t.text.length; sess.words = t.text.split(" ").length; finish(); },
  });
  liveUpdate(null, 1, 0);
}

/* ---------------- practice ---------------- */
function renderPracticePick() {
  clearTimers(); typer = null; setScreen("practice");
  const cats = Object.keys(W.practice);
  view().innerHTML = `<section class="card path"><h2>🧘 Practice</h2><p class="muted">Calm mode: no clock, no score. Type three sentences at your own pace. Slow and smooth beats fast and messy.</p>
  <div class="pcats">${cats.map((c, i) => `<button class="mode card pcat" data-cat="${esc(c)}" style="--c:${["#14b8a6", "#38bdf8", "#f472b6"][i]}"><span class="mi">${["🏟️", "📚", "✨"][i]}</span><b>${esc(c)}</b><small>${i === 0 ? "Grade-level sentences about game day" : i === 1 ? "Writing-class sentences: paragraphs, transitions, essays" : "Opening lines for your own stories"}</small></button>`).join("")}</div></section>`;
  $$(".pcat").forEach((b) => (b.onclick = () => startPractice(b.dataset.cat)));
}
function startPractice(cat) {
  clearTimers(); setScreen("practice-run"); newSess("practice", "Practice: " + cat); sess.extra.cat = cat;
  const lv = PL().level === "guest" ? "vic" : PL().level;
  const list = shuffle(W.practice[cat] || W.sentences[lv]).slice(0, 3);
  view().innerHTML = typingScreen("🧘 Practice", esc(cat) + " · breathe, relax your shoulders, keep wrists floating", `<div class="calm-note" id="calm-note">Sentence 1 of 3</div>`);
  $(".typing").classList.add("calm");
  let i = 0;
  const run = () => {
    $("#calm-note").textContent = `Sentence ${i + 1} of ${list.length}`;
    typer = new Typer(list[i], $("#ty-text"), {
      progress: (t) => liveUpdate(t, list.length, i + t.pos / t.text.length),
      done: (t) => { sess.ms += t.t1 - t.t0; sess.wpmChars += t.text.length; sess.words += t.text.split(" ").length; i++; if (i < list.length) later(run, FAST ? 50 : 350); else finish(); },
    });
  };
  run(); liveUpdate(null, list.length, 0);
}

/* ---------------- penalty kick ---------------- */
function gameShell(title, sub, svg, score) {
  return `<section class="game card"><div class="ty-head"><div><h2>${title}</h2><small class="muted">${sub}</small></div><div class="live">${score}</div></div>
    <div class="scene">${svg}<div class="banner" id="banner"></div></div>
    <div class="word-row"><div class="word" id="word"></div><div class="meter"><i id="meter"></i></div></div>
    <div class="finger-hint">&nbsp;</div>${kbHTML(true)}<div class="legend"><span class="muted">Esc = back to menu</span></div></section>`;
}
function showBanner(text, cls) { const b = $("#banner"); if (!b) return; b.className = "banner show " + (cls || ""); b.textContent = text; later(() => b && b.classList.remove("show"), FAST ? 150 : 1000); }
function pkSVG() {
  let net = ""; for (let x = 210; x <= 590; x += 19) net += `<line x1="${x}" y1="62" x2="${x + (x - 400) * 0.08}" y2="232" />`; for (let y = 62; y <= 232; y += 17) net += `<line x1="${210 - (y - 62) * 0.016}" y1="${y}" x2="${590 + (y - 62) * 0.016}" y2="${y}" />`;
  let crowd = ""; for (let i = 0; i < 112; i++) crowd += `<circle cx="${-200 + (i * 10.8) % 1200}" cy="${14 + (i % 3) * 12}" r="5" fill="${["#8b5cf6", "#f97316", "#38bdf8", "#facc15", "#f472b6"][i % 5]}" opacity=".55"/>`;
  return `<svg viewBox="-200 0 1200 330" class="pk-svg" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="pkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16a34a"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>
    <rect x="-200" width="1200" height="60" fill="#1e293b"/>${crowd}<rect x="-200" y="50" width="1200" height="12" fill="#0f172a"/>
    <rect x="-200" y="62" width="1200" height="268" fill="url(#pkg)"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${-200 + i * 160}" y="62" width="80" height="268" fill="#fff" opacity=".04"/>`).join("")}
    <g stroke="#fff" stroke-opacity=".35" stroke-width="1">${net}</g>
    <path d="M205 234 L205 58 L595 58 L595 234" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/>
    <path d="M-200 236 L1000 236 M190 236 L160 300 L640 300 L610 236" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
    <circle cx="400" cy="305" r="4" fill="#fff"/>
    <g id="keeper" class="anim"><g transform="translate(400,180)">
      <rect x="-22" y="-28" width="44" height="50" rx="10" fill="#facc15"/><text x="0" y="6" text-anchor="middle" font-size="18" font-weight="900" fill="#0f172a" font-family="system-ui">1</text>
      <circle cx="0" cy="-42" r="14" fill="#f1c27d"/><path d="M-14 -46 Q0 -64 14 -46" fill="#5b3a1a"/>
      <rect x="-48" y="-30" width="28" height="10" rx="5" fill="#facc15"/><rect x="20" y="-30" width="28" height="10" rx="5" fill="#facc15"/>
      <circle cx="-50" cy="-25" r="8" fill="#22c55e"/><circle cx="50" cy="-25" r="8" fill="#22c55e"/>
      <rect x="-18" y="20" width="14" height="34" rx="6" fill="#0f172a"/><rect x="4" y="20" width="14" height="34" rx="6" fill="#0f172a"/></g></g>
    <g id="ball" class="anim"><g transform="translate(400,298)"><circle r="13" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><path d="M0 -5 L4.8 -1.5 L3 4 L-3 4 L-4.8 -1.5Z" fill="#0f172a"/></g></g>
  </svg>`;
}
function setT(el, t, anim) { el.style.transition = anim ? `transform ${ANIM * 0.6}ms cubic-bezier(.2,.8,.3,1)` : "none"; el.style.transform = t; }
function startPK() {
  clearTimers(); setScreen("pk"); newSess("pk", "Penalty Kick");
  const N = 8, words = gameWords(N), base = PL().target * 0.75, need = Math.round(clamp(Math.max(base, P().best.wpm * 0.6), 8, 30));
  let i = 0, goals = 0, run = 0, bestRun = 0; const marks = [];
  view().innerHTML = gameShell("⚽ Penalty Kick", `Beat the keeper: type each word at about <b>${need} WPM</b> with no more than 1 slip.`, pkSVG(),
    `<span><b id="pk-goals">0</b> goals</span><span>Kick <b id="pk-n">1</b>/${N}</span><span class="dots" id="pk-dots">${"<i></i>".repeat(N)}</span>`);
  const ball = $("#ball"), keeper = $("#keeper");
  const kick = () => {
    setT(ball, "none", false); setT(keeper, "none", false);
    $("#pk-n").textContent = i + 1; $("#meter").style.width = "0%";
    typer = new Typer(words[i], $("#word"), {
      progress: (t) => { $("#meter").style.width = clamp((100 * t.pos) / t.text.length, 0, 100) + "%"; },
      done: (t) => {
        const wpm = wordWPM(t), goal = t.errors <= 1 && wpm >= need;
        sess.ms += t.t1 - t.shownAt; sess.wpmChars += t.text.length + 1; sess.words++;
        const spots = [[-125, -205], [125, -205], [-130, -95], [130, -95], [-60, -215], [60, -215]], [dx, dy] = rand(spots);
        const side = dx < 0 ? -1 : 1, kdx = goal ? -side * 95 : side * 110;
        setT(ball, `translate(${goal ? dx : dx * 0.85}px, ${goal ? dy : dy + 10}px) scale(.7)`, true);
        setT(keeper, `translate(${kdx}px, ${dy < -150 ? -25 : 20}px) rotate(${kdx > 0 ? 55 : -55}deg)`, true);
        if (goal) { goals++; run++; bestRun = Math.max(bestRun, run); sound("goal"); } else { run = 0; sound("miss"); }
        marks.push(goal); $("#pk-goals").textContent = goals;
        $$("#pk-dots i").forEach((d, j) => (d.className = j < marks.length ? (marks[j] ? "g" : "s") : ""));
        later(() => showBanner(goal ? (run >= 3 ? "HAT TRICK! ⚽⚽⚽" : rand(["GOOOAL!", "Top corner!", "What a strike!"])) : (t.errors > 1 ? "Saved! Clean it up 👍" : "Saved! A bit quicker next time"), goal ? "good" : "meh"), ANIM * 0.45);
        i++;
        later(() => { if (i < N) kick(); else { sess.extra = { goals, kicks: N, bestRun, need }; finish(); } }, ANIM * 1.6);
      },
    });
  };
  kick();
}

/* ---------------- home run derby ---------------- */
const FT = 0.72, FENCE = 360;
function hrSVG() {
  const H = [400, 360], pt = (ft, deg) => [H[0] + Math.sin((deg * Math.PI) / 180) * ft * FT, H[1] - Math.cos((deg * Math.PI) / 180) * ft * FT];
  const fl = pt(470, -45), fr = pt(470, 45), a1 = pt(FENCE - 30, -45), a2 = pt(FENCE + 40, 0), a3 = pt(FENCE - 30, 45);
  let stripes = ""; for (let r = 60; r < 480; r += 40) { const p1 = pt(r, -45), p2 = pt(r, 45); stripes += `<path d="M${p1} A${r * FT} ${r * FT} 0 0 1 ${p2}" stroke="#fff" stroke-opacity=".05" stroke-width="16" fill="none"/>`; }
  return `<svg viewBox="70 0 660 372" class="hr-svg" preserveAspectRatio="xMidYMid meet">
    <rect x="-400" width="1600" height="380" fill="#0b1220"/>
    ${[...Array(9)].map((_, i) => `<circle cx="${60 + i * 85}" cy="${18 + (i % 2) * 6}" r="3" fill="#fde68a"/>`).join("")}
    <path d="M${H} L${fl} L${fr} Z" fill="#15803d"/>
    <path d="M${a1} Q${a2[0]} ${a2[1] - 42} ${a3} L${fr} L${fl} Z" fill="#0b1220"/>
    ${stripes}
    <path d="M${a1} Q${a2[0]} ${a2[1] - 42} ${a3}" stroke="#facc15" stroke-width="6" fill="none"/>
    <path d="M${H} L${pt(127, -45)} L${pt(127 * 1.414, 0)} L${pt(127, 45)} Z" fill="#b45309" opacity=".85"/>
    <path d="M${pt(30, -45)} L${pt(90, -45)} L${pt(90 * 1.414, 0)} L${pt(90, 45)} L${pt(30, 45)} Z" fill="#16a34a"/>
    <circle cx="${pt(60, 0)[0]}" cy="${pt(60, 0)[1]}" r="9" fill="#b45309"/>
    <path d="M${H} L${fl} M${H} L${fr}" stroke="#fff" stroke-width="2"/>
    <text x="${a2[0]}" y="${a2[1] - 30}" text-anchor="middle" fill="#fde68a" font-size="13" font-weight="700" font-family="system-ui">${FENCE} ft</text>
    <path d="M${H[0] - 7} ${H[1] - 4} h14 v6 l-7 6 l-7 -6z" fill="#fff"/>
    <g id="landings"></g>
    <circle id="hrshadow" r="5" fill="#000" opacity="0"/><circle id="hrball" r="6" fill="#fff" stroke="#ef4444" stroke-width="1.5" cx="${H[0]}" cy="${H[1] - 8}"/>
    <text id="hrdist" x="400" y="210" text-anchor="middle" fill="#fff" font-size="40" font-weight="900" font-family="system-ui" opacity="0"></text>
  </svg>`;
}
function flyBall(ft, deg, hr, cb) {
  const H = [400, 360], end = [H[0] + Math.sin((deg * Math.PI) / 180) * ft * FT, H[1] - Math.cos((deg * Math.PI) / 180) * ft * FT];
  const b = $("#hrball"), sh = $("#hrshadow"), dist = $("#hrdist"), dur = FAST ? 200 : 1300, t0 = performance.now(), peak = ft * 0.32;
  sh.setAttribute("opacity", ".35");
  const step = (now) => {
    if (!b.isConnected) return;
    const t = clamp((now - t0) / dur, 0, 1), x = H[0] + (end[0] - H[0]) * t, y = H[1] + (end[1] - H[1]) * t;
    b.setAttribute("cx", x); b.setAttribute("cy", y - Math.sin(Math.PI * t) * peak); b.setAttribute("r", 6 + Math.sin(Math.PI * t) * 5);
    sh.setAttribute("cx", x); sh.setAttribute("cy", y);
    if (t < 1) requestAnimationFrame(step);
    else {
      sh.setAttribute("opacity", "0");
      $("#landings").insertAdjacentHTML("beforeend", `<circle cx="${end[0]}" cy="${end[1]}" r="${hr ? 7 : 5}" fill="${hr ? "#facc15" : "#e2e8f0"}" stroke="#0f172a"/>`);
      dist.textContent = `${Math.round(ft)} ft`; dist.setAttribute("opacity", "1"); later(() => dist.isConnected && dist.setAttribute("opacity", "0"), FAST ? 100 : 900);
      cb && cb();
    }
  };
  requestAnimationFrame(step);
}
function startHR() {
  clearTimers(); setScreen("hr"); newSess("hr", "Home Run Derby");
  const N = 10, words = gameWords(N), target = Math.round(clamp(Math.max(PL().target, P().best.wpm * 0.8), 10, 40));
  let i = 0, hrs = 0, longest = 0, total = 0;
  view().innerHTML = gameShell("⚾ Home Run Derby", `Speed + accuracy = distance. Around <b>${target} WPM</b> and clean clears the ${FENCE} ft fence.`, hrSVG(),
    `<span><b id="hr-n">0</b> HR</span><span>Pitch <b id="hr-p">1</b>/${N}</span><span>Longest <b id="hr-long">0</b> ft</span>`);
  const pitch = () => {
    const b = $("#hrball"); b.setAttribute("cx", 400); b.setAttribute("cy", 352); b.setAttribute("r", 6);
    $("#hr-p").textContent = i + 1; $("#meter").style.width = "0%";
    typer = new Typer(words[i], $("#word"), {
      progress: (t) => { $("#meter").style.width = (100 * t.pos) / t.text.length + "%"; },
      done: (t) => {
        const wpm = wordWPM(t), accF = t.errors === 0 ? 1 : t.errors === 1 ? 0.86 : t.errors === 2 ? 0.7 : 0.5;
        const ft = clamp((150 + 255 * Math.min(1.35, wpm / target)) * accF + (Math.random() * 20 - 10), 90, 480);
        const hr = ft >= FENCE; sess.ms += t.t1 - t.shownAt; sess.wpmChars += t.text.length + 1; sess.words++;
        const deg = (Math.random() * 64 - 32);
        if (hr) { hrs++; sound("hit"); } else sound("ok");
        longest = Math.max(longest, ft); total += ft;
        flyBall(ft, deg, hr, () => { $("#hr-n").textContent = hrs; $("#hr-long").textContent = Math.round(longest);
          showBanner(hr ? rand(["HOME RUN! 💥", "Gone! Way out!", "Moonshot! 🚀"]) : ft > 300 ? "Off the wall! Double!" : ft > 220 ? "Base hit! Keep swinging" : "Fly ball, nice contact", hr ? "good" : "meh"); });
        i++;
        later(() => { if (i < N) pitch(); else { sess.extra = { hrs, pitches: N, longest: Math.round(longest), avg: Math.round(total / N), target }; finish(); } }, (FAST ? 450 : 2300));
      },
    });
  };
  pitch();
}

/* ---------------- two-minute drill ---------------- */
let drillTick = null;
const YX = (yd) => 80 + yd * 8.4;
function drillSVG() {
  let lines = ""; for (let y = 0; y <= 100; y += 5) lines += `<line x1="${YX(y)}" y1="10" x2="${YX(y)}" y2="190" stroke="#fff" stroke-opacity="${y % 10 ? 0.18 : 0.55}" stroke-width="${y % 50 ? 2 : 3}"/>`;
  let nums = ""; for (let y = 10; y <= 90; y += 10) nums += `<text x="${YX(y)}" y="${y === 50 ? 178 : 178}" text-anchor="middle" fill="#fff" fill-opacity=".7" font-size="16" font-weight="800" font-family="system-ui">${y <= 50 ? y : 100 - y}</text>`;
  return `<svg viewBox="0 0 1000 200" class="drill-svg" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="10" width="1000" height="180" fill="#15803d" rx="6"/>${[...Array(10)].map((_, i) => `<rect x="${YX(i * 10)}" y="10" width="42" height="180" fill="#fff" opacity=".035"/>`).join("")}
    <rect x="0" y="10" width="80" height="180" fill="#1e3a8a"/><rect x="920" y="10" width="80" height="180" fill="#7c2d12"/>
    <text x="40" y="100" transform="rotate(-90 40 100)" text-anchor="middle" dy="6" fill="#fff" font-size="20" font-weight="900" font-family="system-ui">HOME</text>
    <text x="960" y="100" transform="rotate(90 960 100)" text-anchor="middle" dy="6" fill="#fff" font-size="20" font-weight="900" font-family="system-ui">END ZONE</text>
    ${lines}${nums}
    <line id="d-fd" x1="0" y1="10" x2="0" y2="190" stroke="#facc15" stroke-width="4"/>
    <line id="d-los" x1="0" y1="10" x2="0" y2="190" stroke="#60a5fa" stroke-width="4"/>
    <g id="d-ball"><ellipse rx="15" ry="9" fill="#92400e" stroke="#451a03" stroke-width="2"/><path d="M-6 0 H6 M-3 -3 V3 M0 -3 V3 M3 -3 V3" stroke="#fff" stroke-width="1.5"/></g>
  </svg>`;
}
function startDrill() {
  clearTimers(); setScreen("drill"); newSess("drill", "Two-Minute Drill");
  const target = Math.round(clamp(Math.max(PL().target, P().best.wpm * 0.8), 10, 40));
  let pos = 25, down = 1, fdLine = 35, points = 0, tds = 0, yards = 0, plays = 0, left = DRILL_SECONDS, started = false, over = false, queue = gameWords(60), qi = 0;
  view().innerHTML = gameShell("🏈 Two-Minute Drill", `Every word is a play. Clean and quick (about ${target} WPM) = big gains. 3+ slips = incomplete pass. Clock starts on your first key.`, drillSVG(),
    `<span class="clock" id="d-clock">${fmt(left)}</span><span><b id="d-pts">0</b> pts</span><span id="d-dd">1st &amp; 10</span>`);
  $(".word-row").insertAdjacentHTML("beforeend", `<div class="upnext" id="d-next"></div>`);
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  const place = (anim) => {
    const b = $("#d-ball"); b.style.transition = anim ? `transform ${FAST ? 120 : 600}ms ease-out` : "none"; b.style.transform = `translate(${YX(pos)}px, 100px)`;
    $("#d-los").setAttribute("x1", YX(pos)); $("#d-los").setAttribute("x2", YX(pos));
    const fd = Math.min(100, fdLine); $("#d-fd").setAttribute("x1", YX(fd)); $("#d-fd").setAttribute("x2", YX(fd));
    const togo = fdLine >= 100 ? "Goal" : Math.max(1, Math.round(fdLine - pos));
    $("#d-dd").innerHTML = `${["1st", "2nd", "3rd", "4th"][down - 1]} &amp; ${togo} · ${pos < 50 ? "own " + Math.round(pos) : pos === 50 ? "50" : "opp " + Math.round(100 - pos)}`;
  };
  const end = () => { if (over) return; over = true; typer = null; clearInterval(drillTick); drillTick = null; kbHighlight(null); showBanner("Final whistle! 🏁", "good");
    sess.extra = { points, tds, yards: Math.round(yards), plays, seconds: DRILL_SECONDS, target }; later(finish, FAST ? 200 : 1200); };
  const tick = () => { left -= 0.25; $("#d-clock").textContent = fmt(Math.max(0, left)); $("#d-clock").classList.toggle("low", left <= 15); if (left <= 0) end(); };
  const play = () => {
    if (over) return;
    const w = queue[qi++ % queue.length]; $("#meter").style.width = "0%";
    $("#d-next").textContent = "Up next: " + queue[qi % queue.length] + "  ·  " + queue[(qi + 1) % queue.length];
    typer = new Typer(w, $("#word"), {
      first: () => { if (!started) { started = true; drillTick = setInterval(tick, 250); } },
      progress: (t) => { $("#meter").style.width = (100 * t.pos) / t.text.length + "%"; },
      done: (t) => {
        if (over) return;
        const wpm = wordWPM(t); sess.ms += t.t1 - (sess.words ? t.shownAt : t.t0); sess.wpmChars += t.text.length + 1; sess.words++; plays++;
        let gain = 0, msg;
        if (t.errors >= 3) msg = "Incomplete pass. Shake it off!";
        else { const ratio = Math.min(1.6, wpm / target); gain = Math.max(1, Math.round(t.text.length * 1.5 * ratio * (t.errors ? 0.6 : 1)));
          if (ratio > 1.25 && !t.errors && Math.random() < 0.35) { gain += 10 + Math.round(Math.random() * 10); msg = `Breakaway! +${gain} yards`; } else msg = `+${gain} yard${gain === 1 ? "" : "s"}`; }
        pos += gain; yards += gain;
        if (pos >= 100) { points += 7; tds++; sound("td"); showBanner("TOUCHDOWN! 🏈 +7", "good"); pos = 100; place(true); pos = 25; down = 1; fdLine = 35; later(() => place(false), FAST ? 100 : 700); }
        else {
          if (pos >= fdLine) { down = 1; fdLine = pos + 10; msg += " · First down!"; sound("ok"); }
          else if (++down > 4) { msg = "Turnover on downs. New drive from the 25!"; pos = 25; down = 1; fdLine = 35; sound("miss"); }
          showBanner(msg, gain >= 8 ? "good" : "meh"); place(true);
        }
        $("#d-pts").textContent = points;
        later(play, FAST ? 30 : 250);
      },
    });
  };
  place(false); play();
}

/* ---------------- results ---------------- */
const BADGES = [
  ["first", "🎽", "First Whistle", "Finish your first session", () => true],
  ["home", "🏠", "Home Row Hero", "Finish both Home Row lessons", (p) => p.lessons.h1 && p.lessons.h2],
  ["path", "🗺️", "Full Path", "Finish all 12 lessons", (p) => LESSONS.every((l) => p.lessons[l.id])],
  ["w15", "🚲", "Cruising", "Reach 15 WPM", (p, r) => r.wpm >= 15],
  ["w25", "🏃", "Breakaway", "Reach 25 WPM", (p, r) => r.wpm >= 25],
  ["w35", "🚀", "Rocket Feet", "Reach 35 WPM", (p, r) => r.wpm >= 35],
  ["acc95", "🎯", "Sharpshooter", "95%+ accuracy in a session", (p, r) => r.acc >= 95 && r.chars >= 20],
  ["clean", "💎", "Clean Sheet", "100% accuracy (40+ characters)", (p, r) => r.acc >= 100 && r.chars >= 40],
  ["hat", "🎩", "Hat Trick", "3 goals in a row in Penalty Kick", (p, r) => r.mode === "pk" && r.extra.bestRun >= 3],
  ["hr3", "💥", "Moonshot", "3+ home runs in one Derby", (p, r) => r.mode === "hr" && r.extra.hrs >= 3],
  ["td", "🏈", "Touchdown!", "Score in the Two-Minute Drill", (p, r) => r.mode === "drill" && r.extra.tds >= 1],
  ["streak3", "🔥", "On Fire", "Type 3 days in a row", (p) => streak(p) >= 3],
  ["calm", "🧘", "Calm Coach", "Finish a Practice session", (p, r) => r.mode === "practice"],
];
function finish() {
  typer = null; clearTimers();
  const p = P(), ms = Math.max(1, sess.ms), wpm = sess.wpmChars ? (sess.wpmChars / 5) / (ms / 60000) : 0;
  const acc = sess.correct + sess.errors ? (100 * sess.correct) / (sess.correct + sess.errors) : 100;
  const r = { mode: sess.mode, label: sess.label, wpm: Math.round(wpm * 10) / 10, acc: Math.round(acc * 10) / 10, chars: sess.correct, errors: sess.errors, ms: Math.round(ms), words: sess.words, extra: sess.extra, date: new Date().toISOString(), player: S.current };
  r.trouble = Object.entries(sess.keyErr).sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const k in sess.keyErr) p.keyErr[k] = (p.keyErr[k] || 0) + sess.keyErr[k];
  for (const k in sess.hits) p.keyHits[k] = (p.keyHits[k] || 0) + sess.hits[k];
  p.sessions.push({ mode: r.mode, label: r.label, wpm: r.wpm, acc: r.acc, date: r.date, extra: r.extra }); if (p.sessions.length > 200) p.sessions.splice(0, p.sessions.length - 200);
  p.words += r.words; if (!p.days.includes(today())) p.days.push(today());
  const before = { ...p.best };
  p.best.wpm = Math.max(p.best.wpm, r.wpm); p.best.acc = Math.max(p.best.acc, r.acc);
  if (r.mode === "pk") p.best.pk = Math.max(p.best.pk, r.extra.goals);
  if (r.mode === "hr") { p.best.hr = Math.max(p.best.hr, r.extra.hrs); p.best.hrLong = Math.max(p.best.hrLong, r.extra.longest); }
  if (r.mode === "drill") p.best.drill = Math.max(p.best.drill, r.extra.points);
  if (r.mode === "lesson") { const id = r.extra.lesson, stars = r.acc >= 96 && r.wpm >= PL().target ? 3 : r.acc >= 90 ? 2 : 1, old = p.lessons[id]; r.stars = stars;
    p.lessons[id] = old ? { stars: Math.max(old.stars, stars), wpm: Math.max(old.wpm, r.wpm), acc: Math.max(old.acc, r.acc) } : { stars, wpm: r.wpm, acc: r.acc }; }
  r.newBadges = BADGES.filter((b) => !p.badges.includes(b[0]) && b[4](p, r)).map((b) => b[0]); p.badges.push(...r.newBadges);
  r.pb = r.wpm > before.wpm && before.wpm > 0;
  save(); lastResult = r; renderResults(r);
}
function ring(val, max, color, label, id) {
  const R = 52, C = 2 * Math.PI * R, f = clamp(val / max, 0, 1);
  return `<div class="ring"><svg viewBox="0 0 120 120" width="132" height="132"><circle cx="60" cy="60" r="${R}" stroke="#1e293b" stroke-width="12" fill="none"/><circle cx="60" cy="60" r="${R}" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div class="rv"><b id="${id}">${Math.round(val)}</b><small>${label}</small></div></div>`;
}
function cheer(r) {
  const n = PL().name;
  if (r.acc >= 97 && r.wpm >= PL().target) return `Elite stuff, ${n}! Fast <i>and</i> clean. That's how champions type.`;
  if (r.acc >= 95) return `Super clean, ${n}! Accuracy first is exactly right. Speed will follow.`;
  if (r.acc >= 88) return `Solid game, ${n}! A few slips. Slow down a touch on the trouble keys and you'll be flying.`;
  return `Nice hustle, ${n}! Try going a little slower; clean keystrokes build speed faster than rushing.`;
}
function modeLine(r) {
  const x = r.extra;
  if (r.mode === "pk") return `⚽ <b>${x.goals}/${x.kicks}</b> goals · best run ${x.bestRun} in a row`;
  if (r.mode === "hr") return `⚾ <b>${x.hrs}</b> home run${x.hrs === 1 ? "" : "s"} · longest ${x.longest} ft · average ${x.avg} ft`;
  if (r.mode === "drill") return `🏈 <b>${x.points}</b> points · ${x.tds} touchdown${x.tds === 1 ? "" : "s"} · ${x.yards} yards on ${x.plays} plays`;
  if (r.mode === "lesson") return `🗺️ ${esc(r.label)} · ${"⭐".repeat(r.stars)}`;
  return `🧘 ${esc(r.label)} · ${r.words} words, nice and calm`;
}
function renderResults(r) {
  setScreen("results");
  const p = P(), again = r.mode === "lesson" ? () => startLesson(r.extra.lesson) : r.mode === "practice" ? () => startPractice(r.extra.cat) : () => go(r.mode);
  const nextL = r.mode === "lesson" ? LESSONS[LESSONS.findIndex((l) => l.id === r.extra.lesson) + 1] : null;
  view().innerHTML = `<section class="results">
    <div class="card res-main">
      <div class="res-h"><h2>Full time! ${r.pb ? `<span class="pbtag">New personal best!</span>` : ""}</h2><p class="mode-line">${modeLine(r)}</p></div>
      <div class="rings">${ring(r.wpm, Math.max(40, r.wpm), "#38bdf8", "WPM", "res-wpm")}${ring(r.acc, 100, r.acc >= 95 ? "#4ade80" : r.acc >= 88 ? "#facc15" : "#fb923c", "% accuracy", "res-acc")}
        <div class="res-facts"><div><b id="res-err">${r.errors}</b> slips</div><div><b>${r.chars}</b> clean keys</div><div><b>${(r.ms / 1000).toFixed(1)}</b> s typing</div></div></div>
      <p class="cheer">${cheer(r)}</p>
      <div class="trouble"><b>Trouble keys:</b> ${r.trouble.length ? r.trouble.map(([k, n]) => `<span class="kchip">${k === " " ? "space" : esc(k.toUpperCase())} <small>×${n}</small></span>`).join("") : `<span class="muted">None! Spotless. 💎</span>`}</div>
      <div class="heat-wrap">${kbHTML(true)}</div>
      ${r.newBadges.length ? `<div class="newb">${r.newBadges.map((id) => { const B = BADGES.find((b) => b[0] === id); return `<div class="badge on pop"><span>${B[1]}</span><b>${B[2]}</b><small>${B[3]}</small></div>`; }).join("")}</div>` : ""}
      <div class="btns"><button class="btn big" id="res-again">↻ Play again</button>${nextL ? `<button class="btn" id="res-next">Next lesson: ${esc(nextL.title)} →</button>` : ""}<button class="btn ghost" id="res-home">🏠 Home</button></div>
    </div>
    <div class="card res-board"><h3>🏆 Sibling Scoreboard</h3>${boardBars()}<p class="muted small">Local to this computer. Everybody's chasing their own best.</p></div>
  </section>`;
  kbHeat($(".heat-wrap"), sess.keyErr, sess.hits);
  $("#res-again").onclick = again; $("#res-home").onclick = renderHome; if (nextL) $("#res-next").onclick = () => startLesson(nextL.id);
}
function boardBars() {
  const ids = Object.keys(PLAYERS), max = Math.max(20, ...ids.map((id) => S.profiles[id].best.wpm));
  return `<div class="bars">${ids.map((id) => { const b = S.profiles[id].best; return `<div class="bar-row">${jersey(id, 34)}<div class="bar-col"><div class="bar-l"><b>${PLAYERS[id].name}</b><span>${Math.round(b.wpm)} WPM</span></div><div class="bar"><i style="width:${(100 * b.wpm) / max}%;background:${PLAYERS[id].color}"></i></div>
    <small class="muted">⚽ ${b.pk} goals · ⚾ ${b.hr} HR (${Math.round(b.hrLong)} ft) · 🏈 ${b.drill} pts</small></div></div>`; }).join("")}</div>`;
}

/* ---------------- leaderboard & locker ---------------- */
function spark(list) {
  const v = list.slice(-12).map((s) => s.wpm); if (v.length < 2) return `<span class="muted small">Play a few rounds to see a trend</span>`;
  const mx = Math.max(...v, 10), pts = v.map((x, i) => `${(i * 120) / (v.length - 1)},${30 - (28 * x) / mx}`).join(" ");
  return `<svg width="124" height="34" viewBox="-2 0 124 34"><polyline points="${pts}" fill="none" stroke="var(--pc)" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
}
function renderBoard() {
  clearTimers(); typer = null; setScreen("board");
  const ids = Object.keys(PLAYERS);
  const row = (label, f) => `<tr><th>${label}</th>${ids.map((id) => `<td>${f(S.profiles[id], id)}</td>`).join("")}</tr>`;
  view().innerHTML = `<section class="card board"><h2>🏆 Sibling Scoreboard</h2><p class="muted">Friendly competition, saved only on this computer. The real opponent is yesterday's you.</p>
  <table><thead><tr><th></th>${ids.map((id) => `<th>${jersey(id, 40)}<div>${PLAYERS[id].name}</div></th>`).join("")}</tr></thead><tbody>
  ${row("Best WPM", (p) => `<b class="big-n">${Math.round(p.best.wpm)}</b>`)}${row("Best accuracy", (p) => Math.round(p.best.acc) + "%")}${row("Avg accuracy (last 10)", (p) => avgAcc(p) + "%")}
  ${row("⚽ Most goals (of 8)", (p) => p.best.pk)}${row("⚾ Most home runs", (p) => p.best.hr)}${row("⚾ Longest blast", (p) => Math.round(p.best.hrLong) + " ft")}${row("🏈 Drill points", (p) => p.best.drill)}
  ${row("Lessons finished", (p) => LESSONS.filter((l) => p.lessons[l.id]).length + "/" + LESSONS.length)}${row("Badges", (p) => p.badges.length + "/" + BADGES.length)}${row("Day streak", (p) => (streak(p) ? "🔥 " : "") + streak(p))}
  ${row("Words typed", (p) => p.words)}${row("WPM trend", (p, id) => `<span style="--pc:${PLAYERS[id].color}">${spark(p.sessions)}</span>`)}
  </tbody></table></section>`;
}
function renderLocker() {
  clearTimers(); typer = null; setScreen("locker");
  const p = P(), trouble = Object.entries(p.keyErr).filter(([k]) => /[a-z]/.test(k)).map(([k, e]) => [k, e / Math.max(1, p.keyHits[k] || 1), e]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  view().innerHTML = `<section class="locker"><div class="card"><h2>${jersey(S.current, 40)} ${esc(PL().full)}'s Locker Room</h2>
    <h3>Key heatmap (all time)</h3><p class="muted small">Redder keys get more slips. Hover a key for the numbers.</p><div class="heat-wrap">${kbHTML(false)}</div>
    <div class="trouble"><b>Focus keys:</b> ${trouble.length ? trouble.map(([k, r, e]) => `<span class="kchip">${k.toUpperCase()} <small>${Math.round(100 * r)}% slips</small></span>`).join("") + ` <button class="btn" id="drill-trouble">🎯 Practice these keys</button>` : `<span class="muted">Play a few rounds and your focus keys will show up here.</span>`}</div>
    <div class="reset-row"><button class="btn ghost small" id="reset-p">Reset ${esc(PL().name)}'s stats</button></div></div>
    <div class="card"><h3>Badges ${p.badges.length}/${BADGES.length}</h3><div class="badges">${BADGES.map((b) => `<div class="badge${p.badges.includes(b[0]) ? " on" : ""}"><span>${b[1]}</span><b>${b[2]}</b><small>${b[3]}</small></div>`).join("")}</div></div></section>`;
  kbHeat($(".heat-wrap"), p.keyErr, p.keyHits);
  const dt = $("#drill-trouble"); if (dt) dt.onclick = () => {
    const keys = trouble.map((t) => t[0]), words = ALL_BANK.filter((w) => keys.some((k) => w.includes(k)));
    const l = { id: "focus", stage: "Focus", icon: "🎯", title: "Focus Keys: " + keys.join(" ").toUpperCase(), keys: keys.join(""), gen: () => keys.map((k) => `${k}${k}${k}`).join(" ") + " " + takeWords(words.length ? words : ALL_BANK, 10) };
    const old = LESSONS.findIndex((x) => x.id === "focus"); if (old >= 0) LESSONS.splice(old, 1); LESSONS.push(l); startLesson("focus"); LESSONS.pop();
  };
  $("#reset-p").onclick = () => { if (confirm(`Reset all of ${PL().name}'s stats, lessons and badges?`)) { S.profiles[S.current] = blankProfile(); save(); renderLocker(); } };
}

/* ---------------- boot ---------------- */
function boot() {
  $$(".nav button").forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $("#chip").onclick = renderHome;
  const st = $("#sound"); const upd = () => (st.textContent = S.sound ? "🔊" : "🔇"); upd(); st.onclick = () => { S.sound = !S.sound; save(); upd(); };
  renderHome();
}
window.KK = {
  peek: () => (typer ? typer.expected() : null), screen: () => screen, result: () => lastResult, state: () => S, go, startLesson, startPractice, lessons: () => LESSONS.map((l) => l.id),
  select: (id) => { S.current = id; save(); renderHome(); },
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
