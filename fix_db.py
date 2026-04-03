import sqlite3

conn = sqlite3.connect('guardianlens.db')
c = conn.cursor()

# Check current columns
c.execute('PRAGMA table_info(chat_history)')
cols = [r[1] for r in c.fetchall()]
print('chat_history cols:', cols)

if 'timestamp' in cols and 'time' not in cols:
    print('Migrating chat_history: renaming timestamp -> time ...')
    c.execute('ALTER TABLE chat_history RENAME TO chat_history_old')
    c.execute("""CREATE TABLE chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        time TEXT DEFAULT (datetime('now', 'localtime'))
    )""")
    c.execute('INSERT INTO chat_history (id, role, message, time) SELECT id, role, message, timestamp FROM chat_history_old')
    c.execute('DROP TABLE chat_history_old')
    conn.commit()
    print('chat_history migrated successfully!')
elif 'time' in cols:
    print('chat_history already has correct schema, no migration needed.')
else:
    print('Unexpected schema:', cols)

# Also verify activity_log
c.execute('PRAGMA table_info(activity_log)')
act_cols = [r[1] for r in c.fetchall()]
print('activity_log cols:', act_cols)

conn.close()
print('Done.')
