import re

filepath = r'C:\Users\LENOVO\.gemini\antigravity\brain\6b8158b1-b0e3-4dd4-81b9-5728019ce634\task.md'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ] 1. **Admin Side:**", "- [x] 1. **Admin Side:**")
content = content.replace("- [ ] 2. **Backend/Database:**", "- [x] 2. **Backend/Database:**")
content = content.replace("- [ ] 3. **User Side:**", "- [/] 3. **User Side:**")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
