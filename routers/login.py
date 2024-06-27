from fastapi import APIRouter, Request, HTTPException
from starlette.responses import RedirectResponse
from utils.verifier import generate_code_verifier_and_challenge, save_code_verifier, get_code_verifier, delete_code_verifier
from utils.token import exchange_code_for_token, validate_token
from config import Config
import os
import datetime
import logging

router = APIRouter()

@router.get("/login")
async def login(request: Request):
    login_timestamp = datetime.datetime.now()
    client_ip = request.client.host

    try:
        code_verifier, code_challenge = await generate_code_verifier_and_challenge()
    except Exception as e:
        logging.error(f"Error generating code verifier and challenge: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    state = os.urandom(24).hex()

    try:
        await save_code_verifier(request.app.state.pool, state, code_verifier, client_ip, login_timestamp)
    except Exception as e:
        logging.error(f"Error saving code verifier: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    cognito_login_url = (
        f"{Config.COGNITO_DOMAIN}/login?response_type=code&client_id={Config.COGNITO_APP_CLIENT_ID}"
        f"&redirect_uri={Config.REDIRECT_URI}&state={state}&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
    )
    return RedirectResponse(cognito_login_url)

@router.get("/callback")
async def callback(request: Request, code: str, state: str):
    query_params = request.query_params
    code = query_params.get('code')
    state = query_params.get('state')
    client_ip = request.client.host

    if not code:
        raise HTTPException(status_code=400, detail="Code parameter is missing")

    code_verifier = await get_code_verifier(request.app.state.pool, state)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Invalid state or code_verifier missing")

    try:
        await delete_code_verifier(request.app.state.pool, state)
    except Exception as e:
        logging.error(f"Error deleting code verifier: {e}")

    try:
        tokens = await exchange_code_for_token(code, code_verifier)
    except Exception as e:
        logging.error(f"Error exchanging code for token: {e}")
        raise HTTPException(status_code=500, detail="Error during token exchange")

    if tokens:
        id_token = tokens['id_token']
        try:
            decoded_token = await validate_token(id_token)
        except Exception as e:
            logging.error(f"Error validating token: {e}")
            raise HTTPException(status_code=500, detail="Error validating token")

        session = request.session
        session['email'] = decoded_token.get('email', 'unknown')
        session['username'] = decoded_token.get('cognito:username', 'unknown')
        session['name'] = decoded_token.get('name', 'unknown')
        session['session_id'] = os.urandom(24).hex()

        try:
            await save_user_info_to_userdata(request.app.state.pool, session)
        except Exception as e:
            logging.error(f"Error saving user information to userdata: {e}")

        session_id = session['session_id']
        session_data = {
            'email': decoded_token.get('email', 'unknown'),
            'username': decoded_token.get('cognito:username', 'unknown'),
            'name': decoded_token.get('name', 'unknown'),
            'session_id': session['session_id']
        }

        try:
            redis_client.set(session_id, json.dumps(session_data), ex=3600)
        except Exception as e:
            logging.error(f"Error saving session data to Redis: {e}")

        chat_html_url = '/chat.html'
        redirect_url = chat_html_url

        response = RedirectResponse(url=redirect_url)
        response.set_cookie(key='session_id', value=request.session['session_id'], httponly=True, secure=True)
        return response
    else:
        raise HTTPException(status_code=400, detail="Error during token exchange")
