// Screenshots via headless Chrome. Seeds realistic demo progress by actually typing (human-ish speed, a few slips), then captures each screen.
import { launch, sleep } from "./cdp.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "file://" + join(ROOT, "dist", "keyboard-kickoff.html");
const SH = (n) => join(ROOT, "screenshots", n);
const b = await launch();
// human-ish typer: delay per key with jitter, occasional slip
async function typeChars(n, { delay = 160, slip = 0.04 } = {}) {
  let typed = 0;
  while (typed < n) {
    let scr; try { scr = await b.ev("KK.screen()"); } catch (e) { console.error("lost page:", await b.ev("location.href + ' | ' + document.body.innerText.slice(0,200)")); throw e; }
    if (scr === "results") return;
    const ch = await b.ev("KK.peek()"); if (ch == null) { await sleep(40); continue; }
    if (Math.random() < slip) { const wrong = "asdfjklqwe".replace(ch, "")[Math.floor(Math.random() * 9)]; await b.key(wrong); await sleep(delay); }
    await b.key(ch); typed++; await sleep(delay * (0.7 + Math.random() * 0.6));
  }
}
async function playToEnd(o) { while ((await b.ev("KK.screen()")) !== "results") await typeChars(5, o); }
async function waitPeek() { for (let i = 0; i < 100 && (await b.ev("KK.peek()")) == null; i++) await sleep(50); }
async function wordDone(o) { await waitPeek(); const n = await b.ev("KK.peek() == null ? 0 : document.querySelectorAll('#word .todo, #word .cur').length"); await typeChars(n, o); }
await b.viewport(1280, 800);
await b.goto(URL + "?fast&drill=12", 1000);
await b.reload(true);
// seed real progress at kid-realistic speeds: Vic ~ 20-25 WPM, Char ~ 30 WPM, with a few slips
const seed = [["vic", ["h1", "h2"], 430, 0.05], ["char", ["h1", "h2", "t1", "t2"], 300, 0.035]];
for (const [p, ls, d, s] of seed) {
  await b.ev(`KK.select("${p}")`);
  for (const l of ls) { await b.ev(`KK.startLesson("${l}")`); await sleep(80); await playToEnd({ delay: d, slip: s }); }
  for (const g of ["pk", "hr", "drill"]) { await b.ev(`KK.go("${g}")`); await sleep(80); await playToEnd({ delay: d, slip: s }); }
}
await b.goto(URL, 900);                       // normal animation speed from here
await b.ev(`KK.select("char")`); await sleep(400);
await b.shot(SH("desktop-01-home.png"));
await b.ev(`KK.go("lessons")`); await sleep(300); await b.shot(SH("desktop-02-lesson-path.png"));
await b.ev(`KK.startLesson("c2")`); await sleep(200); await typeChars(23, { delay: 280, slip: 0 });
for (let i = 0; i < 15 && !(await b.ev("/[A-Z!?\\\"]/.test(KK.peek())")); i++) await typeChars(1, { delay: 280, slip: 0 });
await sleep(300); await b.shot(SH("desktop-03-lesson-keyboard.png"));
// penalty kick: two kicks, then capture the ball hitting the net
await b.ev(`KK.go("pk")`); await sleep(300);
await wordDone({ delay: 280, slip: 0 }); await sleep(1900); await wordDone({ delay: 280, slip: 0 }); await sleep(1900);
await waitPeek(); await typeChars(2, { delay: 280, slip: 0 }); await sleep(150); await b.shot(SH("desktop-04-penalty-typing.png"));
await wordDone({ delay: 280, slip: 0 }); await sleep(620); await b.shot(SH("desktop-05-penalty-goal.png"));
// home run derby
await b.ev(`KK.go("hr")`); await sleep(300);
for (let i = 0; i < 4; i++) { await wordDone({ delay: 280, slip: 0 }); await sleep(2350); }
await wordDone({ delay: 280, slip: 0 }); await sleep(650); await b.shot(SH("desktop-06-derby-flight.png"));
await sleep(2000); await waitPeek(); await typeChars(2, { delay: 280, slip: 0 }); await sleep(100); await b.shot(SH("desktop-07-derby-typing.png"));
// two-minute drill
await b.ev(`KK.go("drill")`); await sleep(300);
for (let i = 0; i < 7; i++) { await wordDone({ delay: 280, slip: 0.02 }); await sleep(300); }
await waitPeek(); await typeChars(2, { delay: 280, slip: 0 }); await sleep(120); await b.shot(SH("desktop-08-drill.png"));
// practice
await b.ev(`KK.startPractice("Story starters")`); await sleep(300); await typeChars(30, { delay: 280, slip: 0.03 }); await sleep(150); await b.shot(SH("desktop-09-practice.png"));
// results (a real lesson with a couple of slips)
await b.ev(`KK.startLesson("s1")`); await sleep(200); await playToEnd({ delay: 280, slip: 0.03 }); await sleep(500); await b.shot(SH("desktop-10-results.png"));
await b.ev(`KK.go("board")`); await sleep(300); await b.shot(SH("desktop-11-scoreboard.png"));
await b.ev(`KK.go("locker")`); await sleep(300); await b.shot(SH("desktop-12-locker-heatmap.png"));
await b.viewport(1440, 900); await b.ev(`KK.go("home")`); await sleep(300); await b.shot(SH("laptop1440-01-home.png"));
await b.ev(`KK.go("pk")`); await sleep(300); await waitPeek(); await typeChars(2, { delay: 280, slip: 0 }); await b.shot(SH("laptop1440-02-penalty.png"));
await b.viewport(390, 844, true, 2); await b.ev(`KK.go("home")`); await sleep(300); await b.shot(SH("phone-01-home.png"));
await b.ev(`KK.startLesson("h2")`); await sleep(300); await b.shot(SH("phone-02-lesson.png"));
await b.ev(`KK.go("hr")`); await sleep(300); await b.shot(SH("phone-03-derby.png"));
console.log(JSON.stringify({ errors: b.errors }));
await b.close();
