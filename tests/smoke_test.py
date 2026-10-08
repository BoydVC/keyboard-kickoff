"""Keyboard Kickoff smoke test.  Run: python3 tests/smoke_test.py   (exit 1 on any failure; output also saved to tests/smoke-test.log)
Static checks (offline, self-contained, word banks), the stdlib server, then a headless-Chrome play test (tests/play.mjs)
that types into the real offline snapshot with simulated keystrokes."""
import json, os, re, socket, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(HERE, "dist", "keyboard-kickoff.html")
LINES, RES = [], []
def log(s): print(s, flush=True); LINES.append(s)
def check(ok, msg): RES.append(bool(ok)); log(("PASS " if ok else "FAIL ") + msg)

log(f"Keyboard Kickoff smoke test · {time.strftime('%Y-%m-%d %H:%M %Z')}")
subprocess.run([sys.executable, os.path.join(HERE, "build.py")], check=True, capture_output=True)
html = open(DIST, encoding="utf-8").read()
check(os.path.getsize(DIST) > 30000, f"offline snapshot built ({os.path.getsize(DIST):,} bytes)")
srcs = {f: open(os.path.join(HERE, "web", f), encoding="utf-8").read() for f in os.listdir(os.path.join(HERE, "web"))}
ext = [m for t in [html, *srcs.values()] for m in re.findall(r"https?://[^\s'\"<>)]+", t)]
check(not ext, f"no external http(s) references in dist or web/ ({ext[:3]})")
check(not re.search(r"<script[^>]+src=|<link[^>]+href=\"(?!data:)|@import\b|url\((?!['\"]?(?:data:|#))", html), "snapshot has no external script/link/import/url() refs (SVG #ids OK)")
check("KK_WORDS" in html and "class Typer" in html and "--ku" in html, "snapshot inlines words.js, app.js and style.css")

# word banks: run words.js in node and inspect
wb = json.loads(subprocess.run(["node", "-e", "require('./web/words.js'); console.log(JSON.stringify(globalThis.KK_WORDS))"], cwd=HERE, capture_output=True, text=True, check=True).stdout)
allw = set(w for w in wb["sports"] + wb["school"] if " " not in w)
home, top = set("asdfghjkl;"), set("qwertyuiop")
check(all(set(w) <= home for w in wb["homeRow"]), f"home-row words use only home-row keys ({len(wb['homeRow'])} words)")
toprow = [w for w in allw if set(w) <= home | top]
check(len(toprow) >= 20, f"enough home+top-row words for the Top Row lesson ({len(toprow)})")
sent = wb["sentences"]["vic"] + wb["sentences"]["char"] + sum((v for v in wb["practice"].values() if v), [])
check(len(wb["sentences"]["vic"]) >= 12 and len(wb["sentences"]["char"]) >= 12, "grade-level sentence banks for Vic (6th) and Char (8th)")
check(not any(re.search(r"\d", s) for s in sent), "sentence banks state no numbers/stats (digits only appear in the Numbers lesson)")
avg = lambda L: sum(len(s.split()) for s in L) / len(L)
check(avg(wb["sentences"]["char"]) > avg(wb["sentences"]["vic"]), f"Char's sentences are longer than Vic's ({avg(wb['sentences']['char']):.1f} vs {avg(wb['sentences']['vic']):.1f} words)")
check(all(len(w) <= 8 for w in wb["short"] + wb["medium"]) and min(len(w) for w in wb["long"]) >= 7, "game word lists graded short / medium / long")

# stdlib server on 127.0.0.1:4353 (or a spare port if 4353 is busy)
def free(p):
    with socket.socket() as s: return s.connect_ex(("127.0.0.1", p)) != 0
port = 4353 if free(4353) else 43531
srv = subprocess.Popen([sys.executable, os.path.join(HERE, "server.py")], env={**os.environ, "KK_PORT": str(port)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    body = None
    for _ in range(40):
        try: body = urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=2).read().decode(); break
        except Exception: time.sleep(0.15)
    snap = urllib.request.urlopen(f"http://127.0.0.1:{port}/dist/keyboard-kickoff.html", timeout=2).read().decode() if body else ""
    check(body and "Keyboard" in body and snap == html, f"server.py serves web/ and the dist snapshot on 127.0.0.1:{port}" + ("" if port == 4353 else " (4353 busy)"))
finally: srv.terminate()

# headless browser play test
log("headless Chrome play test (tests/play.mjs) ...")
t0 = time.time()
r = subprocess.run(["node", "--experimental-websocket", os.path.join(HERE, "tests", "play.mjs")], capture_output=True, text=True, timeout=600)
try: out = json.loads(r.stdout.strip().splitlines()[-1])
except Exception: out = {"checks": [{"ok": False, "msg": "play.mjs crashed: " + (r.stderr or r.stdout)[-400:]}], "results": {}}
for c in out["checks"]: check(c["ok"], "browser: " + c["msg"])
res = out.get("results", {})
for m in ("lesson", "practice", "pk", "hr", "drill"):
    if m in res: log(f"     {m:8s} {res[m]['wpm']:6.1f} WPM  {res[m]['acc']:5.1f}%  errors {res[m]['errors']}  extra {json.dumps(res[m]['extra'])}")
log(f"     play test took {time.time() - t0:.0f}s")

# screenshots
need = ["00-best", "desktop-01-home", "desktop-03-lesson-keyboard", "desktop-05-penalty-goal", "desktop-06-derby-flight", "desktop-08-drill", "desktop-09-practice", "desktop-10-results", "phone-01-home"]
have = os.listdir(os.path.join(HERE, "screenshots"))
missing = [n for n in need if not any(h.startswith(n) and h.endswith(".png") for h in have)]
check(not missing, f"screenshots present ({len(have)} files; missing {missing})")

n, p = len(RES), sum(RES)
log(f"RESULT: {p}/{n} checks passed" + ("" if p == n else f" ({n - p} FAILED)"))
open(os.path.join(HERE, "tests", "smoke-test.log"), "w").write("\n".join(LINES) + "\n")
sys.exit(0 if p == n else 1)
