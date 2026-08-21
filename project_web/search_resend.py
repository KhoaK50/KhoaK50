import os
for root, dirs, files in os.walk('D:/Programming_language/project_web/backend_v2'):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                if 'RESEND' in content:
                    print(f'--- {f} ---')
                    for line in content.split('\n'):
                        if 'RESEND' in line:
                            print(line.strip().encode('ascii', 'ignore').decode('ascii'))
