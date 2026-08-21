import json

path = 'D:/Programming_language/project_web/frontend_v2/js/mock_library.js'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
j = json.loads(c[c.find('{'):c.rfind('}')+1])

with open('curriculum.txt', 'w', encoding='utf-8') as out:
    out.write('=== TOPICS & LESSONS ===\n')
    lessons = {}
    for t in j.get('topics', []):
        out.write(f"Topic: {t['id']} - {t['title']}\n")
        for s in t.get('sections', []):
            for l in s.get('lessons', []):
                lessons[l['id']] = l['title']
                out.write(f"  {l['id']}: {l['title']}\n")

    out.write('\n=== DEPENDENCIES ===\n')
    edges = j.get('graph', {}).get('edges', [])
    for e in edges:
        out.write(f"{e['from']} -> {e['to']} : {lessons.get(e['from'], '')} -> {lessons.get(e['to'], '')}\n")
