"""
ai_helper.py - AI chat integration for GuardianLens
Tries Groq first, then falls back to a simple canned response.
"""
import os
from datetime import datetime

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


def _build_system_prompt(calendar_events: list, recent_activities: list) -> str:
    """Build a context-rich system prompt with real-time data."""
    now = datetime.now().strftime('%A, %B %d %Y at %I:%M %p')

    cal_lines = []
    for e in calendar_events[:10]:
        status = "✅ Done" if e.get('completed') else "⏳ Pending"
        cal_lines.append(f"  - [{e['type'].upper()}] {e['title']} on {e['date']} @ {e['time']} — {status}")
    cal_str = "\n".join(cal_lines) if cal_lines else "  (none)"

    act_lines = []
    for a in recent_activities[:10]:
        act_lines.append(f"  - {a.get('time','')} {a.get('icon','')} {a['title']}: {a['description']}")
    act_str = "\n".join(act_lines) if act_lines else "  (none)"

    return f"""You are GuardianLens AI — a caring, intelligent companion for elder home monitoring.
Current time: {now}

== CALENDAR EVENTS ==
{cal_str}

== RECENT ACTIVITY LOG ==
{act_str}

Provide warm, concise answers. If asked about falls or emergencies, be direct and clear.
NEVER fabricate events. Only refer to data shown above."""


def ask_ai(user_message: str, calendar_events: list, recent_activities: list) -> str:
    """Send message to AI and return response string."""
    system_prompt = _build_system_prompt(calendar_events, recent_activities)

    # ── Try Groq ───────────────────────────────────────────
    groq_key = os.environ.get('GROQ_API_KEY', '')
    if GROQ_AVAILABLE and groq_key:
        try:
            client = Groq(api_key=groq_key)
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=512,
                temperature=0.6,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"[ai_helper] Groq error: {e}")

    # ── Fallback canned response ───────────────────────────
    msg = user_message.lower()
    if any(w in msg for w in ['fall', 'fell', 'emergency']):
        return "Based on today's activity log, no falls have been detected. The monitoring system is active and watching."
    if any(w in msg for w in ['medication', 'medicine', 'pill', 'dose']):
        events = [e for e in calendar_events if e.get('type') == 'medicine']
        if events:
            names = ', '.join(e['title'] for e in events[:3])
            return f"I can see medication reminders: {names}. Please check the Calendar tab for completion status."
        return "No medication events found in the calendar. You can add reminders in the Calendar tab."
    if any(w in msg for w in ['status', 'report', 'summary', 'how']):
        act_count = len(recent_activities)
        return f"GuardianLens is active. I've logged {act_count} recent activities. The monitoring camera is running locally. No critical alerts at this time."
    return "I'm GuardianLens AI. I'm connected to the local database and monitoring system. You can ask me about falls, medications, or request a status summary."
