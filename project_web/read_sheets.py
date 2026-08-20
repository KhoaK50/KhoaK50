import zipfile
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    with zipfile.ZipFile('sheets.xlsx', 'r') as z:
        workbook_xml = z.read('xl/workbook.xml').decode('utf-8')
        sheet_names = re.findall(r'<sheet.*?name="(.*?)"', workbook_xml)
        for i, name in enumerate(sheet_names):
            print(f'{i+1}. {name}')
except Exception as e:
    print(f"Error reading zip: {e}")
