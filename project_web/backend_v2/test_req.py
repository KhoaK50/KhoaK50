import requests
res = requests.get('https://visualization-rr5v.onrender.com/api/verify?token=d257740b1598dc4c2ea194c9bc8ad909a5a958f4', allow_redirects=False)
print(res.status_code)
print(res.headers.get('Location'))
