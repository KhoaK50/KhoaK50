import pytest
from backend_v2.app import app
import json

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_idor_bookmarks(client):
    # Try to access bookmarks without token
    res = client.get('/api/user/bookmarks')
    assert res.status_code == 401
    
    # Try to execute admin query without token
    res2 = client.post('/api/admin/db/query', json={"query": "SELECT * FROM users"})
    assert res2.status_code == 403 or res2.status_code == 401