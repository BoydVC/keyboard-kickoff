# Keyboard Kickoff

**A sports-themed touch-typing trainer for Char and Vic** — home-row lessons, finger-coloured keyboard highlights, then Penalty Kick, Home Run Derby and a Two-Minute Drill, with calm Practice mode and a sibling scoreboard that lives only on this computer.

## Modes
* **🗺️ Lesson Path** — 12 lessons: home row → top row → bottom row → numbers → capitals/punctuation → full sentences. Stars for finish / 90%+ / 96%+ and target WPM. On-screen keyboard highlights the next key and names the finger (and Shift) to use.
* **⚽ Penalty Kick** — 8 words. Type fast and clean to beat the SVG keeper; goals, saves and hat-tricks animate on the pitch.
* **⚾ Home Run Derby** — 10 pitches. Speed + accuracy → fly-ball distance past a 360 ft fence.
* **🏈 Two-Minute Drill** — a timed football drive: every word is a play, 3+ slips = incomplete, first downs and touchdowns score points.
* **🧘 Practice** — no clock, no score. Sports, school & writing, or story-starter sentences at your own pace.

## Profiles & progress
Char (U14 / 8th grade), Vic (12U soccer & 11U baseball / 6th grade) and Guest. Each profile stores WPM, accuracy, day streaks, per-key error heatmap, lesson stars and badges in `localStorage` (`keyboard-kickoff-v1`). Sibling Scoreboard and Locker Room are local only — no accounts, no network.

Word banks are original and kid-appropriate (sports, school, grade-level sentences). Team names like Ravens / Orioles / Chelsea / Terps / Hornets appear as cheers only — no real-world stats, scores or roster facts.

## How to run
```bash
./run.sh start          # build + serve on http://127.0.0.1:4353/
./run.sh stop | status
./run.sh build          # refresh dist/keyboard-kickoff.html
./run.sh test           # full smoke test → tests/smoke-test.log
./run.sh shots          # regenerate screenshots (types at kid speed, ~8 min)
./run.sh all            # shots + test + start
```
Or open `dist/keyboard-kickoff.html` directly — one self-contained offline file, works from `file://` or a USB stick.

**Best screenshot:** `screenshots/00-best-home.png`

## Test result
`tests/smoke_test.py`: **49/49 checks passed** (offline + no external http(s), word-bank integrity, stdlib server on :4353, zero console errors, no horizontal overflow at 1440×900 / 1280×800 / 390×844, phone keyboard note, simulated keystrokes complete a lesson and each game mode with sane WPM/accuracy, a wrong key is counted as an error, profiles persist, badges & heatmap update). See `tests/smoke-test.log`.

## Files
```
web/           index.html · style.css · words.js · app.js
dist/          keyboard-kickoff.html   (offline single-file snapshot)
server.py      stdlib HTTP on 127.0.0.1:4353
build.py       inlines web/ → dist/
run.sh         start | stop | build | test | shots | all
tests/         smoke_test.py · play.mjs · shots.mjs · cdp.mjs · smoke-test.log
screenshots/   desktop, 1440 laptop, phone (00-best-home.png)
```


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/keyboard-kickoff` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
