import psycopg2
from vectoria_api.config import DB_URL
try:
    conn = psycopg2.connect(DB_URL)
    c = conn.cursor()
    c.execute("SELECT topic_id, order_index FROM lessons WHERE topic_id = 't1' AND order_index = 1")
    row = c.fetchone()
    print('Row:', row)
except Exception as e:
    print('Error:', e)
