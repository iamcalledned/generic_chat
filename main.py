from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from middlewares import SESSION_SECRET_KEY
from startup import startup_event
from routers import login, session

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

app.add_event_handler("startup", startup_event)

app.include_router(login.router)
app.include_router(session.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
