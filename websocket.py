# websocket.py

import asyncio
import json
import logging
from uuid import uuid4
import traceback
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, APIRouter, Request, Depends, status, Body
from starlette.websockets import WebSocket
from config import Config
from db_functions import create_db_pool, get_user_id, get_active_thread_for_user, get_recent_messages
from handlers import (
    handle_chat_message,
    handle_clear_conversations,
    handle_delete_selected_threads,
    handle_load_more_messages,
    handle_pong,
    handle_select_persona
)
from utilities import clear_session_data_after_timeout, verify_session_id, format_response

import redis
from jose import JWTError, jwt  # Import JWT library for token validation

# Initialize Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Initialize FastAPI app
app = FastAPI()
router = APIRouter()

OPENAI_API_KEY = Config.OPENAI_API_KEY
connections = {}
tasks = {}  # Dictionary to track scheduled tasks for session cleanup

log_file_path = Config.LOG_PATH
LOG_FORMAT = 'WEBSOCKET - %(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s'

logging.basicConfig(
    filename=log_file_path,
    level=logging.DEBUG,
    format=LOG_FORMAT
)

# Async function to create a connection pool
async def create_pool():
    return await create_db_pool()

# Function to restrict access to localhost
def verify_localhost(request: Request):
    client_host = request.client.host
    print("Client host:", client_host)
    if client_host != "127.0.0.1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This endpoint is restricted to local access only."
        )

# Endpoint to directly generate an answer
@router.post("/generate_answer_direct")
async def generate_answer_direct(
    request: Request,
    username: str = Body(...),
    message: str = Body(...),
    persona: str = Body(...),
    client_ip: str = Body("127.0.0.1"),
    verify: None = Depends(verify_localhost)
):
    uuid = str(uuid4())
    user_ip = client_ip  # Use the provided IP or a default value
    print("User IP:", user_ip)
    print("username:", username)
    print("persona:", persona)
    response_json, content_type, recipe_id = await generate_answer(app.state.pool, username, message, user_ip, uuid, persona)
    response_text = format_response(response_json, content_type)
    response = {
        'response': response_text,
        'type': content_type,
        'recipe_id': recipe_id
    }
    return response

app.include_router(router)

@router.post("/logout")
async def logout(request: Request):
    session_id = request.json().get('session_id', '')
    if session_id:
        # Remove session data from Redis
        redis_client.delete(session_id)

        # Additional cleanup if necessary
        username = connections.pop(session_id, None)
        if username:
            print(f"User {username} logged out and disconnected.")

    return {"message": "Logged out successfully"}

@app.on_event("startup")
async def startup_event():
    app.state.pool = await create_pool()
    print("Database pool created")
    print("connections at startup:", connections)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.headers.get('Authorization')
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        session_id = payload.get("session_id")
        if not session_id:
            await websocket.close(code=1008)
            return

        session_data = redis_client.get(session_id)
        if not session_data:
            await websocket.close(code=1008)
            return

        session_data = json.loads(session_data)
        connection_data = {'username': session_data['username'], 'persona': None}
        connections[session_id] = connection_data

    except JWTError:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    client_host, client_port = websocket.client
    client_ip = client_host

    async def ping_client():
        while True:
            try:
                await websocket.send_text(json.dumps({'action': 'ping'}))
                await asyncio.sleep(30)
            except Exception as e:
                print(f"Error sending ping: {e}")
                break

    ping_task = asyncio.create_task(ping_client())

    try:
        initial_data = await websocket.receive_text()
        initial_data = json.loads(initial_data)

        while True:
            data = await websocket.receive_text()
            data_dict = json.loads(data)

            if not session_id or not redis_client.exists(session_id):
                await websocket.send_text(json.dumps({'action': 'redirect_login', 'error': 'Invalid or expired session'}))
                await websocket.close(code=1008)
                return

            redis_client.expire(session_id, 3600)

            action = data_dict.get('action')
            connection_data['persona'] = data_dict.get('persona')
            if action == 'persona_selected':
                connection_data['persona'] = data_dict.get('persona')
                await handle_select_persona(websocket, data_dict, app.state.pool, connection_data['username'])
            elif action == 'pong':
                await handle_pong(websocket, redis_client, session_id)
            elif action == 'load_more_messages':
                await handle_load_more_messages(websocket, data_dict, app.state.pool, connection_data['username'], connection_data['persona'])
            elif action == 'clear_conversations':
                await handle_clear_conversations(websocket, data_dict, app.state.pool, connection_data['username'], connection_data['persona'])
            elif action == 'delete_selected_threads':
                await handle_delete_selected_threads(websocket, data_dict, app.state.pool, connection_data['username'])
            elif action == 'chat_message':
                await handle_chat_message(websocket, data_dict, app.state.pool, connection_data['username'], client_ip, connection_data['persona'])
            else:
                print("Invalid action:", data_dict)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user {connection_data['username']}")
        if session_id:
            task = asyncio.create_task(clear_session_data_after_timeout(session_id, connection_data['username'], redis_client, app.state.pool))
            tasks[session_id] = task
        connections.pop(session_id, None)
    except Exception as e:
        print(f"Unhandled exception for user {connection_data['username']}: {e}")
        print("Exception Traceback: " + traceback.format_exc())
    finally:
        ping_task.cancel()

@router.post("/validate_session")
async def validate_session(request: Request):
    session_id = request.json().get('session_id', '')
    if session_id and redis_client.exists(session_id):
        return {"status": "valid"}
    else:
        return {"status": "invalid"}

# Run with Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
