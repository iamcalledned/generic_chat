import os
import base64
import hashlib
import redis
import datetime
from config import Config
from db_functions import create_db_pool, save_code_verifier, get_code_verifier, delete_code_verifier, delete_old_verifiers

redis_client = redis.Redis(host='localhost', port=6379, db=0)

async def generate_code_verifier_and_challenge():
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode('utf-8')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode('utf-8')).digest()
    ).rstrip(b'=').decode('utf-8')
    return code_verifier, code_challenge

async def save_code_verifier(pool, state, code_verifier, client_ip, login_timestamp):
    await save_code_verifier(pool, state, code_verifier, client_ip, login_timestamp)

async def get_code_verifier(pool, state):
    return await get_code_verifier(pool, state)

async def delete_code_verifier(pool, state):
    await delete_code_verifier(pool, state)
