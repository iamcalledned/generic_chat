# process_handler.py

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from starlette.requests import Request

import os
import base64
import hashlib
import httpx
import jwt
import datetime
import json
import time
import pymysql
from config import Config
from db_functions import create_db_pool, save_code_verifier, get_code_verifier, generate_code_verifier_and_challenge, get_data_from_db, save_user_info_to_userdata, delete_code_verifier, delete_old_verifiers
from jwt.algorithms import RSAAlgorithm
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import logging
import asyncio
from jose import JWTError, jwt  # Import JWT library for token generation

import redis

log_file_path = Config.LOG_PATH
LOG_FORMAT = 'LOGIN-PROCESS -  %(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s'

logging.basicConfig(
    filename=Config.LOG_PATH_PROCESS_HANDLER,
    level=logging.DEBUG,  # Adjust the log level as needed (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format=LOG_FORMAT
)

# Initialize Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0)  # Adjust host and port as needed
logging.info(f"redis-client created at port")
print(f"redis-client created at port")

app = FastAPI()

# Define session middleware
SESSION_SECRET_KEY = os.urandom(24).hex()
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

#####!!!!  Startup   !!!!!!################
@app.on_event("startup")
async def startup():
    app.state.pool = await create_db_pool()  # No argument is passed here
    logging.info(f"Database pool created")
    print(f"Database pool created: {app.state.pool}")
    asyncio.create_task(schedule_verifier_cleanup(app.state.pool, redis_client))

#####!!!!  Startup   !!!!!!################

async def schedule_verifier_cleanup(pool, redis_client):
    while True:
        # Attempt to acquire the lock
        if redis_client.set("verifier_cleanup_lock", "true", nx=True, ex=60):
            await delete_old_verifiers(pool)
        # Wait for 60 seconds before the next attempt
        await asyncio.sleep(600)

##################################################################
######!!!!       Routes                !!!!!######################
##################################################################

##################################################################
######!!!!     Start login endpoint    !!!!!######################
##################################################################

@app.get("/login")
async def login(request: Request):
    # Set login timestamp
    login_timestamp = datetime.datetime.now()

    # Getting the client's IP address
    client_ip = request.client.host

    # Get code_verifier and code_challenge
    try:
        code_verifier, code_challenge = await generate_code_verifier_and_challenge()
    except Exception as e:
        logging.error(f"Error generating code verifier and challenge: {e}")
        print(f"Error generating code verifier and challenge: {e}")

    # Generate a state code to link things later
    state = os.urandom(24).hex()  # Generate a random state value

    try:
        await save_code_verifier(app.state.pool, state, code_verifier, client_ip, login_timestamp)  # Corrected function name
    except Exception as e:
        logging.error(f"Error saving code verifier: {e}")
        print(f"Error saving code verifier: {e}")

    cognito_login_url = (
        f"{Config.COGNITO_DOMAIN}/login?response_type=code&client_id={Config.COGNITO_APP_CLIENT_ID}"
        f"&redirect_uri={Config.REDIRECT_URI}&state={state}&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
    )

    return RedirectResponse(cognito_login_url)

##################################################################
######!!!!     End login endpoint      !!!!!######################
##################################################################

##################################################################
######!!!!     Start callback  endpoint!!!!!######################
##################################################################

# Define a secret key to sign the JWT tokens
JWT_SECRET_KEY = Config.JWT_SECRET_KEY
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_TIME_MINUTES = 60

def create_jwt_token(data: dict, expires_delta: timedelta = timedelta(minutes=JWT_EXPIRATION_TIME_MINUTES)):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

@app.get("/callback")
async def callback(request: Request, code: str, state: str):
    # Extract query parameters
    query_params = request.query_params
    code = query_params.get('code')
    state = query_params.get('state')
    client_ip = request.client.host

    if not code:
        raise HTTPException(status_code=400, detail="Code parameter is missing")

    # Retrieve the code_verifier using the state
    code_verifier = await get_code_verifier(app.state.pool, state)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Invalid state or code_verifier missing")

    # Delete the code verifier since we don't really need it anymore and it's risky
    try:
        await delete_code_verifier(app.state.pool, state)
    except Exception as e:
        logging.error(f"Error deleting code verifier: {e}")
        print(f"Error deleting code verifier: {e}")

    try:
        tokens = await exchange_code_for_token(code, code_verifier)
    except Exception as e:
        logging.error(f"Error exchanging code for token: {e}")
        print(f"Error exchanging code for token: {e}")

    if tokens:
        id_token = tokens['id_token']
        try:
            decoded_token = await validate_token(id_token)
        except Exception as e:
            logging.error(f"Error validating token: {e}")
            print(f"Error validating token: {e}")

        # Create a session ID and store it in Redis
        session_id = os.urandom(24).hex()
        session_data = {
            'email': decoded_token.get('email', 'unknown'),
            'username': decoded_token.get('cognito:username', 'unknown'),
            'name': decoded_token.get('name', 'unknown'),
            'session_id': session_id
        }

        try:
            redis_client.set(session_id, json.dumps(session_data), ex=3600)  # ex is expiry time in seconds
        except Exception as e:
            logging.error(f"Error saving session data to Redis: {e}")
            print(f"Error saving session data to Redis: {e}")

        # Generate a JWT token
        jwt_token = create_jwt_token({"session_id": session_id})

        # Return the JWT token in the response
        return JSONResponse(content={"token": jwt_token})

    else:
        return 'Error during token exchange.', 400

##################################################################
######!!!!     End callback endpoint   !!!!!######################
##################################################################

##################################################################
######!!!!     start get session endpoint!!######################
##################################################################

@app.get("/get_session_data")
async def get_session_data(request: Request):
    print("at /get_session_data")
    # Retrieve session data
    session_id = request.session.get('session_id')

    # If session_id is not available, return an error
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID not found in session data")

    # Retrieve additional data from the database using the session_id
    db_data = await get_data_from_db(session_id, app.state.pool)
    state = db_data['state']
    username = db_data.get('username')

    return JSONResponse(content={
        "sessionId": session_id,
        "nonce": state,
        "userInfo": username  # or db_data if you have merged them
    })

##################################################################
######!!!!     end get session endpoint  !!######################
##################################################################

##################################################################
######!!!!     Start Functions           !!!!!####################
##################################################################

# Exchange code for token
async def exchange_code_for_token(code, code_verifier):
    token_url = f"{Config.COGNITO_DOMAIN}/oauth2/token"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {
        'grant_type': 'authorization_code',
        'client_id': Config.COGNITO_APP_CLIENT_ID,
        'code': code,
        'redirect_uri': Config.REDIRECT_URI,
        'code_verifier': code_verifier
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json()
    else:
        return None

# Validate token
async def validate_token(id_token):
    COGNITO_USER_POOL_ID = Config.COGNITO_USER_POOL_ID
    COGNITO_APP_CLIENT_ID = Config.COGNITO_APP_CLIENT_ID
    jwks_url = f"https://cognito-idp.us-east-1.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    with httpx.Client() as client:
        jwks_response = client.get(jwks_url)
    jwks = jwks_response.json()

    headers = jwt.get_unverified_header(id_token)
    kid = headers['kid']
    key = [k for k in jwks['keys'] if k['kid'] == kid][0]
    pem = RSAAlgorithm.from_jwk(json.dumps(key))

    decoded_token = jwt.decode(
        id_token,
        pem,
        algorithms=['RS256'],
        audience=COGNITO_APP_CLIENT_ID
    )
    return decoded_token

######   Sessions

async def get_session(request: Request):
    return request.session

##################################################################

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
    # uvicorn process_handler:app --workers 4 --port=8001 --reload
