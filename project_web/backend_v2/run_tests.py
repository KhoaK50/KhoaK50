from app import app
import json

app.config['TESTING'] = True
client = app.test_client()

print('Testing unauthenticated access to bookmarks...')
res = client.get('/api/user/bookmarks')
if res.status_code == 401:
    print('PASS: /api/user/bookmarks returned 401')
else:
    print(f'FAIL: /api/user/bookmarks returned {res.status_code}')

print('\nTesting admin db/query...')
res2 = client.post('/api/admin/db/query', json={'query': 'SELECT * FROM users'})
if res2.status_code in [401, 403]:
    print(f'PASS: /api/admin/db/query returned {res2.status_code}')
else:
    print(f'FAIL: /api/admin/db/query returned {res2.status_code}')

print('\nTesting global error handler...')
# Let's hit an endpoint that doesn't exist, it should return 404
res3 = client.get('/nonexistent')
print(f'404 test returned {res3.status_code}')
