from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from middlewares import SESSION_SECRET_KEY
from routers import login, session
from startup import setup_startup_event

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

setup_startup_event(app)

app.include_router(login.router)
app.include_router(session.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
