from fastapi import APIRouter, Request, HTTPException
from starlette.responses import JSONResponse
from utils.db import get_data_from_db

router = APIRouter()

@router.get("/get_session_data")
async def get_session_data(request: Request):
    session_id = request.session.get('session_id')

    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID not found in session data")

    db_data = await get_data_from_db(session_id, app.state.pool)
    state = db_data['state']
    username = db_data.get('username')

    return JSONResponse(content={
        "sessionId": session_id,
        "nonce": state,
        "userInfo": username
    })
