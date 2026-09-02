from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request
import jwt
from vectoria_api.config import JWT_SECRET_KEY

def get_user_id():
    # If user has a valid JWT, rate limit by user_id
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                return str(data.get('user_id'))
            except:
                pass
    # Otherwise, fallback to IP
    return get_remote_address()

limiter = Limiter(
    key_func=get_user_id,
    default_limits=["2000 per day", "200 per hour"],
    storage_uri="memory://"
)