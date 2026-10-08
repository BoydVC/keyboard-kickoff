// Headless play test: drives the real offline snapshot with simulated keystrokes and prints JSON results.
import { launch, autoplay, sleep } from "./cdp.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "file://" + join(ROOT, "dist", "keyboard-kickoff.html");
const out = { checks: [], results: {} };
const check = (ok, msg) => out.checks.push({ ok: !!ok, msg });
const b = await launch();
try {
  await b.viewport(1440, 900);
  await b.goto(URL + "?fast&drill=8", 1000);
  await b.reload(true);
  check((await b.ev("KK.screen()")) === "home", "home screen loads");
  const overflow = async () => b.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
  const screensToCheck = ["home", "lessons", "practice", "board", "locker"];
  for (const [w, h, m] of [[1440, 900, false], [1280, 800, false], [390, 844, true]]) {
    await b.viewport(w, h, m, 1); let worst = 0;
    for (const s of screensToCheck) { await b.ev(`KK.go("${s}")`); await sleep(120); worst = Math.max(worst, await overflow()); }
    await b.ev(`KK.startLesson("s1")`); await sleep(120); worst = Math.max(worst, await overflow());
    for (const g of ["pk", "hr", "drill"]) { await b.ev(`KK.go("${g}")`); await sleep(150); worst = Math.max(worst, await overflow()); }
    await b.ev(`KK.go("home")`);
    check(worst <= 0, `no horizontal overflow at ${w}x${h} (worst ${worst}px)`);
  }
  check(await b.ev(`getComputedStyle(document.querySelector('.kbd-note')).display !== 'none'`), "phone shows 'needs a keyboard' note at 390 wide");
  await b.viewport(1440, 900); await b.ev(`KK.go("home")`);
  check(await b.ev(`getComputedStyle(document.querySelector('.kbd-note')).display === 'none'`), "keyboard note hidden on laptop width");

  // Lesson 1 with one deliberate wrong key
  await b.ev(`KK.select("char"); KK.startLesson("h1")`); await sleep(150);
  const nextKey = await b.ev(`document.querySelector('.key.next')?.dataset.k`), peek0 = await b.ev("KK.peek()");
  check(nextKey && nextKey === peek0, `on-screen keyboard highlights the next key (${nextKey})`);
  check(await b.ev(`/with your (left|right) (pinky|ring|middle|index)/.test(document.querySelector('.finger-hint').textContent)`), "finger hint names the finger to use");
  await b.key(peek0 === "x" ? "q" : "x"); await sleep(80);
  check((await b.ev("KK.peek()")) === peek0, "wrong key does not advance the cursor");
  check((await b.ev(`document.querySelector('#lv-err').textContent`)) === "1", "wrong key shows as 1 slip live");
  check(await b.ev(`!!document.querySelector('.cur.bad')`), "wrong key marks the current letter red");
  const tl = Date.now(); const ap = await autoplay(b, { delay: 150 }); const nominal = (ap.keys / 5) / ((Date.now() - tl) / 60000);
  let r = await b.ev("KK.result()"); out.results.lesson = r;
  check(r.mode === "lesson" && r.errors === 1, `lesson result counts the wrong key as 1 error (got ${r.errors})`);
  check(r.wpm > 20 && r.wpm < 120 && Math.abs(r.wpm - nominal) / nominal < 0.35, `lesson WPM sane and matches the simulated typing speed (${r.wpm} vs ~${nominal.toFixed(1)} wall-clock)`);
  check(r.acc > 90 && r.acc < 100, `lesson accuracy sane and below 100 (${r.acc})`);
  check(r.trouble.length === 1 && r.trouble[0][1] === 1, `trouble keys lists the missed key (${JSON.stringify(r.trouble)})`);
  check(await b.ev(`!!document.querySelector('#res-wpm') && +document.querySelector('#res-wpm').textContent === Math.round(KK.result().wpm)`), "results screen shows WPM");
  check(await b.ev(`+document.querySelector('#res-acc').textContent === Math.round(KK.result().acc)`), "results screen shows accuracy");
  check(await b.ev(`KK.state().profiles.char.lessons.h1 && KK.state().profiles.char.lessons.h1.stars >= 1`), "lesson progress saved with stars");
  check(await b.ev(`KK.state().profiles.char.keyErr[KK.result().trouble[0][0]] === 1`), "per-key error heatmap stored on profile");
  check(await b.ev(`document.querySelectorAll('.heat-wrap .key.hot').length === 1`), "results heatmap marks exactly one hot key");

  // every lesson completes (Vic profile)
  await b.ev(`KK.select("vic")`); let lessonsOk = 0; const ids = await b.ev("KK.lessons()");
  for (const id of ids) { await b.ev(`KK.startLesson("${id}")`); await sleep(60); await autoplay(b, { delay: 8 }); const rr = await b.ev("KK.result()"); if (rr.mode === "lesson" && rr.extra.lesson === id && rr.errors === 0 && rr.acc === 100) lessonsOk++; }
  check(lessonsOk === ids.length, `all ${ids.length} lessons complete with simulated typing (${lessonsOk})`);
  check(await b.ev(`KK.state().profiles.vic.badges.includes("path")`), "Full Path badge after all lessons");

  // practice
  await b.ev(`KK.select("char"); KK.startPractice("Story starters")`); await sleep(100);
  await autoplay(b, { delay: 110 }); r = await b.ev("KK.result()"); out.results.practice = r;
  check(r.mode === "practice" && r.words > 10 && r.acc === 100 && r.wpm > 20 && r.wpm < 140, `practice completes (${r.words} words, ${r.wpm} WPM)`);

  // penalty kick
  await b.ev(`KK.go("pk")`); await sleep(100); await autoplay(b, { delay: 120 }); r = await b.ev("KK.result()"); out.results.pk = r;
  check(r.mode === "pk" && r.extra.kicks === 8 && r.extra.goals >= 0 && r.extra.goals <= 8 && r.words === 8, `penalty kick completes (${r.extra.goals}/8 goals, ${r.wpm} WPM)`);
  check(r.wpm > 15 && r.wpm < 140 && r.acc === 100, `penalty kick WPM/accuracy sane (${r.wpm} WPM, ${r.acc}%)`);
  // penalty kick with sloppy typing should be saved
  await b.ev(`KK.go("pk")`); await sleep(100);
  { let kicks = 0; while ((await b.ev("KK.screen()")) !== "results") { const ch = await b.ev("KK.peek()"); if (ch == null) { await sleep(30); continue; }
      const pos = await b.ev(`document.querySelectorAll('#word .ok, #word .fx').length`); if (pos === 0 && (await b.ev(`!document.querySelector('#word .bad')`))) { for (let k = 0; k < 3; k++) await b.key(ch === "x" ? "q" : "x"); kicks++; }
      await b.key(ch); await sleep(20); } }
  r = await b.ev("KK.result()");
  check(r.extra.goals === 0 && r.errors === 24 && r.acc < 100, `sloppy kicks (3 slips each) are all saved and 24 errors counted (goals ${r.extra.goals}, errors ${r.errors})`);

  // home run derby
  await b.ev(`KK.go("hr")`); await sleep(100); await autoplay(b, { delay: 120 }); r = await b.ev("KK.result()"); out.results.hr = r;
  check(r.wpm > 15 && r.wpm < 140, `derby WPM sane (${r.wpm})`);
  check(r.mode === "hr" && r.extra.pitches === 10 && r.words === 10 && r.extra.longest >= 90 && r.extra.longest <= 480, `home run derby completes (${r.extra.hrs} HR, longest ${r.extra.longest} ft)`);
  check(await b.ev(`KK.state().profiles.char.best.hrLong`) === r.extra.longest || (await b.ev(`KK.state().profiles.char.best.hrLong`)) >= r.extra.longest, "longest homer saved to profile");

  // two-minute drill (8 s clock via ?drill=8)
  await b.ev(`KK.go("drill")`); await sleep(100); const t0 = Date.now(); await autoplay(b, { delay: 120, maxMs: 30000 }); const el = Date.now() - t0; r = await b.ev("KK.result()"); out.results.drill = r;
  check(r.mode === "drill" && r.extra.plays > 3 && r.extra.yards > 0 && el > 7000 && el < 16000, `two-minute drill runs its clock and ends (${r.extra.plays} plays, ${r.extra.yards} yd, ${r.extra.points} pts, ${el} ms)`);
  check(r.wpm > 15 && r.wpm < 140 && r.acc === 100, `drill WPM/accuracy sane (${r.wpm})`);
  check(await b.ev(`KK.result().wpm`) > 0 && (await b.ev(`KK.state().profiles.char.best.wpm`)) >= r.wpm, "best WPM tracked on profile");

  // leaderboard
  await b.ev(`KK.go("board")`); await sleep(100);
  check(await b.ev(`document.querySelectorAll('.board thead th').length === 4 && /Char/.test(document.querySelector('.board').textContent) && /Vic/.test(document.querySelector('.board').textContent)`), "sibling scoreboard lists Char, Vic and Guest");
  // persistence
  await b.reload();
  check(await b.ev(`KK.state().profiles.char.sessions.length >= 5 && KK.state().profiles.vic.sessions.length === 12`), "profiles persist in localStorage after reload");
  await b.ev(`KK.go("locker")`); await sleep(100);
  check(await b.ev(`document.querySelectorAll('.badge.on').length >= 3`), "locker room shows earned badges");
  check(b.errors.length === 0, `zero console errors (${JSON.stringify(b.errors)})`);
  const ext = b.requests.filter((u) => /^https?:/.test(u)); check(ext.length === 0, `no network requests (${ext.length})`);
} catch (e) { check(false, "exception: " + e.message); }
await b.close();
console.log(JSON.stringify(out));
