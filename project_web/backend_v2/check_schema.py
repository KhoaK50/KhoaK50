import psycopg2
from vectoria_api.config import DB_URL

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lesson_comments'")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
