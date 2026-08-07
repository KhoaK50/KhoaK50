import os

req_path = r"D:\Programming_language\project_web\backend_v2\requirements.txt"

try:
    with open(req_path, 'rb') as f:
        raw_data = f.read()

    # Thử decode bằng nhiều format
    for enc in ['utf-8', 'utf-16le', 'utf-16', 'windows-1252']:
        try:
            text = raw_data.decode(enc)
            print(f"Decoded successfully with {enc}")
            # Viết lại file dưới dạng UTF-8
            with open(req_path, 'w', encoding='utf-8') as fw:
                # Bỏ bớt dòng trống thừa mứa
                clean_text = "\n".join(line for line in text.splitlines() if line.strip())
                fw.write(clean_text + "\n")
            print("Successfully rewritten requirements.txt as UTF-8.")
            break
        except Exception:
            pass
except Exception as e:
    print("Error:", e)
