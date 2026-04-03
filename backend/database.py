"""
database.py - SQLite database helpers for GuardianLens
"""
import sqlite3
import os
from datetime import datetime

# DB path is at project root (one level above backend/)
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'guardianlens.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    # Members table
    c.execute('''
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'family',
            age INTEGER DEFAULT 0,
            condition TEXT DEFAULT '',
            relation TEXT DEFAULT '',
            avatar TEXT DEFAULT '👤',
            face_scanned INTEGER DEFAULT 0,
            face_image BLOB
        )
    ''')

    # Calendar/events table
    c.execute('''
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT DEFAULT 'other',
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    ''')

    # Activity log table
    c.execute('''
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            icon TEXT DEFAULT '📋',
            timestamp TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # Chat history table
    c.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # Notification config table (single row)
    c.execute('''
        CREATE TABLE IF NOT EXISTS notification_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            twilio_sid TEXT DEFAULT '',
            twilio_token TEXT DEFAULT '',
            phone_from TEXT DEFAULT '',
            phone_to TEXT DEFAULT '',
            whatsapp_enabled INTEGER DEFAULT 0,
            telegram_token TEXT DEFAULT '',
            telegram_chat_id TEXT DEFAULT ''
        )
    ''')
    # Ensure a default row exists
    c.execute('INSERT OR IGNORE INTO notification_config (id) VALUES (1)')

    conn.commit()
    conn.close()


# ── Members ───────────────────────────────────────────────

def get_all_members():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM members').fetchall()
    conn.close()
    result = []
    for row in rows:
        m = dict(row)
        # face_image may be bytes (BLOB) or already a base64 string (TEXT)
        fi = m.get('face_image')
        if fi is None or fi == '' or fi == b'':
            m['face_image'] = ''
        elif isinstance(fi, bytes):
            import base64
            m['face_image'] = base64.b64encode(fi).decode()
        else:
            # Already a string — pass through as-is
            m['face_image'] = str(fi)
        result.append(m)
    return result


def add_member(name, role, age, condition, avatar):
    conn = get_conn()
    conn.execute(
        'INSERT INTO members (name, role, age, condition, avatar) VALUES (?, ?, ?, ?, ?)',
        (name, role, age, condition, avatar)
    )
    conn.commit()
    conn.close()


def delete_member(member_id: int):
    conn = get_conn()
    conn.execute('DELETE FROM members WHERE id = ?', (member_id,))
    conn.commit()
    conn.close()


def enroll_member_face(member_id: int, image_data: bytes):
    conn = get_conn()
    conn.execute(
        'UPDATE members SET face_scanned = 1, face_image = ? WHERE id = ?',
        (image_data, member_id)
    )
    conn.commit()
    conn.close()


# ── Calendar ──────────────────────────────────────────────

def get_all_events():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM calendar_events ORDER BY date, time').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_event(title, description, date, time, event_type):
    conn = get_conn()
    conn.execute(
        'INSERT INTO calendar_events (title, description, date, time, type) VALUES (?, ?, ?, ?, ?)',
        (title, description, date, time, event_type)
    )
    conn.commit()
    conn.close()


def toggle_event(event_id: int):
    conn = get_conn()
    conn.execute(
        'UPDATE calendar_events SET completed = 1 - completed WHERE id = ?',
        (event_id,)
    )
    conn.commit()
    conn.close()


def delete_event(event_id: int):
    conn = get_conn()
    conn.execute('DELETE FROM calendar_events WHERE id = ?', (event_id,))
    conn.commit()
    conn.close()


# ── Activity Log ──────────────────────────────────────────

def log_activity(title: str, description: str = '', icon: str = '📋'):
    conn = get_conn()
    now_ist = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn.execute(
        'INSERT INTO activity_log (title, description, icon, timestamp) VALUES (?, ?, ?, ?)',
        (title, description, icon, now_ist)
    )
    conn.commit()
    conn.close()


def get_recent_activity(limit: int = 20):
    conn = get_conn()
    rows = conn.execute(
        'SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', (limit,)
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        try:
            dt = datetime.fromisoformat(d['timestamp'])
            # If timestamp looks like UTC (older records), add IST offset (+5:30)
            from datetime import timedelta
            if dt.hour < 12 and datetime.now().hour > 14:
                dt = dt + timedelta(hours=5, minutes=30)
            d['time'] = dt.strftime('%I:%M %p')
        except Exception:
            d['time'] = d['timestamp']
        result.append(d)
    return result


def get_alerts_today() -> int:
    conn = get_conn()
    today = datetime.now().strftime('%Y-%m-%d')
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM activity_log WHERE title LIKE '%Fall%' AND timestamp LIKE ?",
        (f'{today}%',)
    ).fetchone()
    conn.close()
    return row['cnt'] if row else 0


# ── Notification Config ───────────────────────────────────

def get_notification_config() -> dict:
    conn = get_conn()
    row = conn.execute('SELECT * FROM notification_config WHERE id = 1').fetchone()
    conn.close()
    return dict(row) if row else {}


def save_notification_config(twilio_sid, twilio_token, phone_from, phone_to,
                              whatsapp_enabled, telegram_token, telegram_chat_id):
    conn = get_conn()
    conn.execute('''
        UPDATE notification_config SET
            twilio_sid=?, twilio_token=?, phone_from=?, phone_to=?,
            whatsapp_enabled=?, telegram_token=?, telegram_chat_id=?
        WHERE id = 1
    ''', (twilio_sid, twilio_token, phone_from, phone_to,
          1 if whatsapp_enabled else 0, telegram_token, telegram_chat_id))
    conn.commit()
    conn.close()


# ── Chat History ──────────────────────────────────────────

def save_chat_message(role: str, message: str):
    conn = get_conn()
    now_ist = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn.execute(
        'INSERT INTO chat_history (role, message, created_at) VALUES (?, ?, ?)',
        (role, message, now_ist)
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 50):
    conn = get_conn()
    rows = conn.execute(
        'SELECT * FROM chat_history ORDER BY id DESC LIMIT ?', (limit,)
    ).fetchall()
    conn.close()
    result = []
    for row in reversed(rows):
        d = dict(row)
        try:
            dt = datetime.fromisoformat(d['created_at'])
            d['time'] = dt.strftime('%I:%M %p')
        except Exception:
            d['time'] = d.get('created_at', '')
        result.append(d)
    return result
