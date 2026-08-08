import os
directory = r'D:\Programming_language\project_web\admin_v2\src\pages'
for filename in os.listdir(directory):
    if filename.endswith('.jsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'http://localhost:5000' in content:
            new_content = content.replace('http://localhost:5000', 'https://visualization-rr5v.onrender.com')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Reverted {filename}')
