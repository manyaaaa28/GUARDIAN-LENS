"""
notifications.py - SMS, WhatsApp, and Telegram fall alert notifications
"""
import os
import threading
import requests

_last_notif_time = 0
_cooldown_seconds = 60  # Don't spam — min 60s between alerts


def _get_config():
    from backend import database as db
    return db.get_notification_config()


def send_fall_alert(bypass_cooldown=False):
    """Send fall alert via all configured channels. Called from camera thread."""
    import time
    global _last_notif_time
    now = time.time()
    if not bypass_cooldown and now - _last_notif_time < _cooldown_seconds:
        print(f"[notifications] Cooldown active, skipping alert.")
        return
    _last_notif_time = now

    # Run in background so camera thread isn't blocked
    t = threading.Thread(target=_dispatch_all, daemon=True)
    t.start()


def _dispatch_all():
    cfg = _get_config()
    if not cfg:
        print("[notifications] No config found.")
        return

    print(f"[notifications] Config loaded: telegram_token={'SET' if cfg.get('telegram_token') else 'EMPTY'}, chat_id={cfg.get('telegram_chat_id','EMPTY')}")
    msg = "🚨 GUARDIANLENS ALERT: A fall has been detected! Please check on the person immediately."

    if cfg.get('twilio_sid') and cfg.get('twilio_token') and cfg.get('phone_to') and cfg.get('phone_from'):
        _send_sms(cfg, msg)
        if cfg.get('whatsapp_enabled'):
            _send_whatsapp(cfg, msg)

    if cfg.get('telegram_token') and cfg.get('telegram_chat_id'):
        _send_telegram(cfg, msg)


def _send_sms(cfg, msg):
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{cfg['twilio_sid']}/Messages.json"
        resp = requests.post(url, data={
            'From': cfg['phone_from'],
            'To': cfg['phone_to'],
            'Body': msg,
        }, auth=(cfg['twilio_sid'], cfg['twilio_token']), timeout=10)
        print(f"[notifications] SMS sent: {resp.status_code}")
    except Exception as e:
        print(f"[notifications] SMS error: {e}")


def _send_whatsapp(cfg, msg):
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{cfg['twilio_sid']}/Messages.json"
        resp = requests.post(url, data={
            'From': f"whatsapp:{cfg['phone_from']}",
            'To': f"whatsapp:{cfg['phone_to']}",
            'Body': msg,
        }, auth=(cfg['twilio_sid'], cfg['twilio_token']), timeout=10)
        print(f"[notifications] WhatsApp sent: {resp.status_code}")
    except Exception as e:
        print(f"[notifications] WhatsApp error: {e}")


def _send_telegram(cfg, msg):
    try:
        url = f"https://api.telegram.org/bot{cfg['telegram_token']}/sendMessage"
        resp = requests.post(url, json={
            'chat_id': cfg['telegram_chat_id'],
            'text': msg,
            'parse_mode': 'HTML',
        }, timeout=10)
        print(f"[notifications] Telegram sent: {resp.status_code}")
    except Exception as e:
        print(f"[notifications] Telegram error: {e}")
