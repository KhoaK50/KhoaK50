import re

path = 'D:/Programming_language/project_web/backend_v2/sync_pg_to_neo4j.py'
with open(path, 'r', encoding='utf-8') as f:
    py = f.read()

# Replace hardcoded Neo4j password with os.getenv
py = re.sub(
    r'NEO4J_PASSWORD = ".*?"', 
    'NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")', 
    py
)
py = re.sub(
    r'NEO4J_URI = ".*?"', 
    'NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://4dd80172.databases.neo4j.io")', 
    py
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(py)
print("Done")
