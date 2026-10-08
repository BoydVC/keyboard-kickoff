"""Inline web/ into one self-contained offline file: dist/keyboard-kickoff.html"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, "web")
html = open(os.path.join(W, "index.html")).read()
css = open(os.path.join(W, "style.css")).read()
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
for js in ("words.js", "app.js"):
    src = open(os.path.join(W, js)).read().replace("</script", "<\\/script")
    html = html.replace(f'<script src="{js}"></script>', "<script>\n" + src + "\n</script>")
assert 'src="' not in html and 'href="style' not in html
os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
out = os.path.join(HERE, "dist", "keyboard-kickoff.html"); open(out, "w").write(html)
print(f"wrote {out} ({os.path.getsize(out):,} bytes)")
