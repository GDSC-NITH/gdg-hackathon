# Local server for the site: `python3 -m http.server` plus Cache-Control: no-cache.
# Without it the browser guesses freshness for each ES module separately, and a
# reload can pair a new module with a stale one, which stops startup.
# It also answers byte ranges: Safari only plays <video> from servers that do.
# Usage: python3 tools/serve.py [port] [--lan]
#   With no port, the OS picks a free one and the browser opens that address.
#   --lan also lets phones on the same Wi-Fi open it (and anyone else on that network, while it runs).
#   The chosen address is printed, and written to tools/.serve-url for the checks.
import functools, http.server, os, pathlib, signal, socket, sys, threading, webbrowser

args = [a for a in sys.argv[1:] if a != '--lan']
lan = '--lan' in sys.argv[1:]
chosen = int(args[0]) if args else 0
root = pathlib.Path(__file__).resolve().parent.parent
url_file = root / 'tools' / '.serve-url'

class Handler(http.server.SimpleHTTPRequestHandler):
    left = None  # bytes still to send for a range reply

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        if self.path.split('?', 1)[0] in ['/homecraft.json', '/examples/terry-home/homecraft.json']:
            self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def send_head(self):
        spec = self.headers.get('Range', '')
        path = self.translate_path(self.path)
        if not spec.startswith('bytes=') or not os.path.isfile(path):
            return super().send_head()
        first, _, last = spec[6:].split(',')[0].strip().partition('-')
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404)
            return None
        size = os.fstat(f.fileno()).st_size
        try:
            start, end = (int(first), int(last) if last else size - 1) if first else (size - int(last), size - 1)
        except ValueError:
            f.close()
            return super().send_head()
        start, end = max(0, start), min(end, size - 1)
        if start > end:
            f.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        f.seek(start)
        self.left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        if self.left is None:
            return super().copyfile(source, outputfile)
        while self.left > 0:
            chunk = source.read(min(64 * 1024, self.left))
            if not chunk:
                break
            outputfile.write(chunk)
            self.left -= len(chunk)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()

    def do_POST(self):
        clean_path = self.path.split('?', 1)[0]
        if clean_path == '/api/chat':
            import json, urllib.request, urllib.error
            length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(length) if length > 0 else b'{}'

            # 1. Forward to local Express backend if running on :8787
            try:
                fwd = urllib.request.Request(
                    'http://127.0.0.1:8787/api/chat',
                    data=body_bytes,
                    headers={'Content-Type': 'application/json'},
                    method='POST',
                )
                with urllib.request.urlopen(fwd, timeout=5) as resp:
                    resp_bytes = resp.read()
                    self.send_response(resp.status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-cache')
                    self.end_headers()
                    self.wfile.write(resp_bytes)
                    return
            except Exception:
                pass

            # 2. Check for GROQ_API_KEY in environment or backend/.env
            groq_key = os.environ.get('GROQ_API_KEY', '').strip()
            if not groq_key:
                env_path = root / 'backend' / '.env'
                if env_path.exists():
                    for line in env_path.read_text(encoding='utf-8').splitlines():
                        if line.strip().startswith('GROQ_API_KEY='):
                            groq_key = line.split('=', 1)[1].strip()
                            break

            if groq_key:
                try:
                    payload = json.loads(body_bytes.decode('utf-8'))
                    msg = payload.get('message', '').strip()
                    history = payload.get('history', [])
                    groq_req_data = json.dumps({
                        'model': os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile'),
                        'messages': [
                            {'role': 'system', 'content': 'You are Labyrinth, a friendly and concise hackathon mascot dog. Answer questions accurately based on the Labyrinth hackathon in 1-3 short sentences.'},
                            *history,
                            {'role': 'user', 'content': msg}
                        ],
                        'temperature': 0.2,
                        'max_tokens': 150,
                    }).encode('utf-8')
                    groq_req = urllib.request.Request(
                        'https://api.groq.com/openai/v1/chat/completions',
                        data=groq_req_data,
                        headers={
                            'Content-Type': 'application/json',
                            'Authorization': f'Bearer {groq_key}',
                        },
                        method='POST',
                    )
                    with urllib.request.urlopen(groq_req, timeout=15) as g_resp:
                        g_data = json.loads(g_resp.read().decode('utf-8'))
                        reply_text = g_data['choices'][0]['message']['content'].strip()
                        out_data = json.dumps({'reply': reply_text}).encode('utf-8')
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Cache-Control', 'no-cache')
                        self.end_headers()
                        self.wfile.write(out_data)
                        return
                except Exception as e:
                    err_out = json.dumps({'reply': f'*whine* Error reaching Groq: {e}'}).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-cache')
                    self.end_headers()
                    self.wfile.write(err_out)
                    return

            # 3. Friendly fallback explanation
            fallback = json.dumps({
                'reply': "Woof! To enable AI responses locally, either start the Express server ('cd backend && npm start') or set GROQ_API_KEY in backend/.env! 🐾"
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(fallback)
            return

        self.send_error(404, 'Not Found')

host = '0.0.0.0' if lan else '127.0.0.1'
try:
    server = http.server.ThreadingHTTPServer((host, chosen), functools.partial(Handler, directory=str(root)))
except OSError:
    raise SystemExit(f'Port {chosen} is already in use.')
port = server.server_address[1]
url = f'http://127.0.0.1:{port}/'
print(url, flush=True)
if lan:
    # The address this computer uses on the local network (nothing is sent).
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(('10.255.255.255', 1))
        print(f'http://{probe.getsockname()[0]}:{port}/   (phones on the same Wi-Fi)', flush=True)
    except OSError:
        pass
    finally:
        probe.close()
url_file.write_text(url)
def open_browser():
    try:
        webbrowser.open(url)
    except OSError:
        pass
if not chosen:
    threading.Timer(0.2, open_browser).start()
def stop(_signum, _frame):
    raise KeyboardInterrupt
for name in ('SIGTERM', 'SIGHUP'):
    if hasattr(signal, name):
        signal.signal(getattr(signal, name), stop)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
    try:
        if url_file.read_text() == url:
            url_file.unlink()
    except OSError:
        pass
