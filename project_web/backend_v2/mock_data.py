
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv('DB_URL', 'postgresql://postgres:postgres@localhost:5432/vectoria')

conn = psycopg2.connect(DB_URL)
c = conn.cursor()

topic_id = 'mock_t1'
order_index = 1
section_id = 'mock_s1'

# Insert Topic
c.execute('''INSERT INTO topics (id, title) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING''', (topic_id, 'Chủ đề Mock'))

# Insert Section
c.execute('''INSERT INTO sections (id, topic_id, title, order_index) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING''', (section_id, topic_id, 'Phần 1', 1))

# Insert VI Lesson
vi_title = 'Bài 1: Giới thiệu AI'
vi_html = '<h2>Xin chào!</h2><p>Đây là bài học tiếng Việt về AI.</p>'
c.execute('''INSERT INTO lessons (topic_id, order_index, section_id, title, content_html, complexity, time) 
VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index) 
DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;''', 
(topic_id, order_index, section_id, vi_title, vi_html, 1.0, 10))

# Insert EN Translation
en_title = 'Lesson 1: Intro to AI'
en_html = '<h2>Hello!</h2><p>This is the English lesson about AI.</p>'
c.execute('''INSERT INTO lesson_translations (topic_id, order_index, language_code, title, content_html) 
VALUES (%s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index, language_code) 
DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;''', 
(topic_id, order_index, 'en', en_title, en_html))

conn.commit()
conn.close()
print('Mock data inserted successfully!')
