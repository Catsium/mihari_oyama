import os
import re
import shutil
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file, abort

app = Flask(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
HTML_FILE  = os.path.join(BASE_DIR, 'timetable.html')
BACKUP     = os.path.join(BASE_DIR, 'timetable.html.bak')
AVATAR_DIR = os.path.join(BASE_DIR, 'avatars')

# Token auth is OPTIONAL: only enforced when SAVE_TOKEN is explicitly set in the
# environment. Unset (default) => same-origin clients can save/upload with no token,
# so the app works out of the box without entering a URL or password.
SAVE_TOKEN = os.environ.get('SAVE_TOKEN', '')

AVATAR_EXT = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB

def check_token():
    if not SAVE_TOKEN:
        return  # auth disabled — open editing
    if request.headers.get('X-Save-Token', '') != SAVE_TOKEN:
        abort(401, 'Unauthorized')

def _safe_username(name):
    s = re.sub(r'[^A-Za-z0-9_-]', '', name or '')
    return s[:64] if s else None

@app.route('/')
def index():
    return send_file(HTML_FILE, mimetype='text/html')

STATIC_FILES = {
    'favicon.ico', 'favicon.svg', 'favicon-96x96.png',
    'apple-touch-icon.png', 'web-app-manifest-192x192.png',
    'web-app-manifest-512x512.png', 'site.webmanifest'
}

@app.route('/avatars/<path:filename>')
def serve_avatar(filename):
    if '/' in filename or '\\' in filename:
        abort(404)
    if '.' not in filename:
        abort(404)
    base, ext = filename.rsplit('.', 1)
    safe = _safe_username(base)
    ext_lower = ext.lower()
    if not safe or ext_lower not in AVATAR_EXT:
        abort(404)
    path = os.path.join(AVATAR_DIR, f'{safe}.{ext_lower}')
    if not os.path.exists(path):
        abort(404)
    return send_file(path)

@app.route('/<path:filename>')
def serve_static(filename):
    if filename not in STATIC_FILES:
        abort(404)
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        abort(404)
    return send_file(filepath)

@app.route('/ping')
def ping():
    check_token()
    return jsonify({'ok': True, 'time': datetime.now(timezone.utc).isoformat()})

@app.route('/save', methods=['POST'])
def save():
    check_token()
    html = request.get_data(as_text=True)
    if len(html) < 1000:
        abort(400, 'Content too short — something went wrong on the client side.')
    if os.path.exists(HTML_FILE):
        shutil.copy2(HTML_FILE, BACKUP)
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html)
    return jsonify({'ok': True, 'saved': datetime.now(timezone.utc).isoformat()})

@app.route('/upload-avatar', methods=['POST'])
def upload_avatar():
    check_token()
    username = _safe_username(request.form.get('username', ''))
    if not username:
        abort(400, 'Invalid username')
    f = request.files.get('file')
    if not f or not f.filename:
        abort(400, 'No file')
    if '.' not in f.filename:
        abort(400, 'No file extension')
    ext = f.filename.rsplit('.', 1)[-1].lower()
    if ext not in AVATAR_EXT:
        abort(400, 'Unsupported file type')
    data = f.read()
    if len(data) > MAX_AVATAR_BYTES:
        abort(413, 'File too large (max 2 MB)')
    if not data:
        abort(400, 'Empty file')
    os.makedirs(AVATAR_DIR, exist_ok=True)
    if os.path.isdir(AVATAR_DIR):
        for old in os.listdir(AVATAR_DIR):
            if '.' not in old:
                continue
            if old.rsplit('.', 1)[0] == username:
                try:
                    os.remove(os.path.join(AVATAR_DIR, old))
                except OSError:
                    pass
    path = os.path.join(AVATAR_DIR, f'{username}.{ext}')
    with open(path, 'wb') as out:
        out.write(data)
    return jsonify({'ok': True, 'url': f'/avatars/{username}.{ext}'})

if __name__ == '__main__':
    app.run(debug=False)
