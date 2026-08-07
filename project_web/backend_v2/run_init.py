import sys
import io
import os

# Fix encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

print("Initializing DB...")
from vectoria_api.routes.course import init_course_db
init_course_db()
print("Done!")
