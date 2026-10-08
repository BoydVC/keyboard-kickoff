"""Keyboard Kickoff dev server: stdlib only, binds 127.0.0.1:4353. Serves web/ (source) and /dist/ (offline snapshot)."""
import http.server, os, socketserver
HERE = os.path.dirname(os.path.abspath(__file__)); PORT = int(os.environ.get("KK_PORT", 4353))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=os.path.join(HERE, "web"), **k)
    def translate_path(self, path):
        p = path.split("?")[0]
        if p.startswith("/dist/"): return os.path.join(HERE, "dist", os.path.basename(p))
        return super().translate_path(path)
    def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True; allow_reuse_address = True
if __name__ == "__main__":
    print(f"Keyboard Kickoff on http://127.0.0.1:{PORT}/  (offline snapshot: /dist/keyboard-kickoff.html)", flush=True)
    S(("127.0.0.1", PORT), H).serve_forever()
