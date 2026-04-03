"""Quick test to call /api/chat and print out any error details."""
import sys
sys.path.insert(0, '.')

# Try calling chat directly without HTTP
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

print("GROQ_API_KEY set?", bool(os.environ.get('GROQ_API_KEY')))
print("Key starts with:", os.environ.get('GROQ_API_KEY', '')[:8])

# Test DB functions directly
from backend import database as db

print("\n--- Testing save_chat_message ---")
try:
    db.save_chat_message("user", "test message")
    print("save_chat_message: OK")
except Exception as e:
    print("save_chat_message ERROR:", e)

print("\n--- Testing get_chat_history ---")
try:
    h = db.get_chat_history()
    print("get_chat_history: OK, rows:", len(h))
except Exception as e:
    print("get_chat_history ERROR:", e)

print("\n--- Testing ai_helper.ask_ai ---")
try:
    from backend import ai_helper
    resp = ai_helper.ask_ai("hello", [], [])
    print("ask_ai response:", resp[:200])
except Exception as e:
    import traceback
    print("ask_ai ERROR:", e)
    traceback.print_exc()
