import re

path = 'D:/Programming_language/project_web/backend_v2/vectoria_api/config.py'
with open(path, 'r', encoding='utf-8') as f:
    py = f.read()

# Remove the hardcoded DB_URL
py = re.sub(r'DB_URL = "postgresql://.*?"', 'DB_URL = os.getenv("DB_URL", "")', py)

with open(path, 'w', encoding='utf-8') as f:
    f.write(py)
