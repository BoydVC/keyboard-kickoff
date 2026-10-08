// Tiny Chrome DevTools Protocol driver (Node 20 + --experimental-websocket). Throwaway profile, headless.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch() {
  // --remote-debugging-port=0 lets Chrome pick a free port and write it into our own throwaway profile, so we can never attach to another Chrome on this machine.
  const prof = mkdtempSync(join(tmpdir(), "kkcdp-"));
  const proc = spawn("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--no-first-run",
    "--remote-debugging-port=0", `--user-data-dir=${prof}`, "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 160 && !target; i++) { await sleep(250);
    try { const [port, path] = readFileSync(join(prof, "DevToolsActivePort"), "utf8").trim().split("\n");
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === "page" && t.url === "about:blank"); } catch {} }
  if (!target) { proc.kill(); throw new Error("chrome did not start"); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let id = 0; const pending = new Map(); const errors = []; const requests = [];
  ws.addEventListener("message", (m) => { const j = JSON.parse(m.data);
    if (j.id && pending.has(j.id)) { pending.get(j.id)(j); pending.delete(j.id); }
    if (j.method === "Runtime.exceptionThrown") errors.push(j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text);
    if (j.method === "Runtime.consoleAPICalled" && j.params.type === "error") errors.push("console.error: " + j.params.args.map((a) => a.value ?? a.description).join(" "));
    if (j.method === "Log.entryAdded" && j.params.entry.level === "error") errors.push("log: " + j.params.entry.text);
    if (j.method === "Network.requestWillBeSent") requests.push(j.params.request.url); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, (j) => r(j.result || {})); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable"); await send("Network.enable");
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + expr.slice(0, 90) + " :: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value; };
  const viewport = (w, h, mobile = false, scale = 1) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile });
  const ready = async () => { for (let i = 0; i < 200; i++) { const r = await send("Runtime.evaluate", { expression: "typeof KK !== 'undefined' && document.readyState === 'complete' && !!document.querySelector('#view').children.length", returnByValue: true }); if (r.result?.value === true) return; await sleep(100); } throw new Error("page never became ready"); };
  const goto = async (url, wait = 300) => { await send("Page.navigate", { url }); await sleep(250); await ready(); await sleep(wait); };
  const reload = async (clear = false) => { if (clear) await send("Runtime.evaluate", { expression: "localStorage.clear()" }); await send("Page.reload", {}); await sleep(250); await ready(); await sleep(200); };
  const key = async (ch) => { const p = { key: ch, text: ch, unmodifiedText: ch, code: ch === " " ? "Space" : undefined };
    await send("Input.dispatchKeyEvent", { type: "keyDown", ...p }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code: p.code }); };
  const shot = async (path) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(path, Buffer.from(r.data, "base64")); };
  const close = async () => { try { ws.close(); } catch {} proc.kill(); await sleep(300); rmSync(prof, { recursive: true, force: true }); };
  return { send, ev, viewport, goto, reload, ready, key, shot, close, errors, requests };
}
// type whatever the game expects until it reaches the results screen (or `stop` returns true)
export async function autoplay(b, { delay = 70, wrongFirst = false, stop = null, maxMs = 60000 } = {}) {
  const t0 = Date.now(); let wrongSent = false, keys = 0;
  while (Date.now() - t0 < maxMs) {
    if ((await b.ev("KK.screen()")) === "results") return { keys, wrongSent };
    if (stop && (await stop())) return { keys, wrongSent };
    const ch = await b.ev("KK.peek()");
    if (ch == null) { await sleep(40); continue; }
    if (wrongFirst && !wrongSent) { await b.key(ch === "x" ? "q" : "x"); wrongSent = true; await sleep(delay); continue; }
    await b.key(ch); keys++; await sleep(delay);
  }
  throw new Error("autoplay timed out on screen " + (await b.ev("KK.screen()")));
}
