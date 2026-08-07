import json
import re
import psycopg2
import sys
import os

# Add vectoria_api to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from vectoria_api.config import DB_URL

# Path to the mock file
MOCK_FILE_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "frontend_v2",
    "js",
    "mock_library.js"
)

def extract_json_from_js(filepath):
    print(f"Reading {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # S dng fallback method trc vA vi const ... multiline
    start_idx = content.find('{')
    end_idx = content.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = content[start_idx:end_idx+1]
    else:
        raise ValueError("Could not extract JSON from JS file.")

    print("Parsing JSON data...")
    return json.loads(json_str)

def sync_to_pg(data):
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    c = conn.cursor()

    topics = data.get("topics", [])
    topic_count = 0
    section_count = 0
    lesson_count = 0

    for t in topics:
        topic_id = t["id"]
        title = t["title"]
        summary = "No summary"
        
        # Insert Topic (Ignore duplicates if already exists)
        c.execute("""
            INSERT INTO topics (id, title, summary)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
        """, (topic_id, title, summary))
        topic_count += 1

        sections = t.get("sections", [])
        for s_idx, s in enumerate(sections):
            section_id = s["id"]
            sec_title = s["title"]
            order_index = s_idx + 1

            # Insert Section
            c.execute("""
                INSERT INTO sections (id, topic_id, title, order_index)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, order_index = EXCLUDED.order_index
            """, (section_id, topic_id, sec_title, order_index))
            section_count += 1

            lessons = s.get("lessons", [])
            for l in lessons:
                # order_index chA-nh lA bin num
                l_order = l["num"]
                l_title = l["title"]
                l_complexity = l.get("complexity", 5)
                l_time = l.get("time", 45)
                l_abstract = l.get("abstract", "")
                l_content = l.get("contentHTML", "")

                # Insert Lesson
                c.execute("""
                    INSERT INTO lessons (topic_id, order_index, section_id, title, content_html, complexity, time)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (topic_id, order_index) DO UPDATE SET
                        section_id = EXCLUDED.section_id,
                        title = EXCLUDED.title,
                        content_html = EXCLUDED.content_html,
                        complexity = EXCLUDED.complexity,
                        time = EXCLUDED.time
                """, (topic_id, l_order, section_id, l_title, l_content, l_complexity, l_time))
                lesson_count += 1

    conn.commit()
    conn.close()
    
    print(f"Sync complete!")
    print(f"Processed: {topic_count} Topics, {section_count} Sections, {lesson_count} Lessons.")

if __name__ == "__main__":
    try:
        data = extract_json_from_js(MOCK_FILE_PATH)
        sync_to_pg(data)
    except Exception as e:
        print("Error:", e)
