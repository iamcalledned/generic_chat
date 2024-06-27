import asyncio
import logging
from utils.db import create_db_pool, delete_old_verifiers
from config import Config
from main import app  # Import the app instance from main.py

log_file_path = Config.LOG_PATH
LOG_FORMAT = 'LOGIN-PROCESS -  %(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s'

logging.basicConfig(
    filename=Config.LOG_PATH_PROCESS_HANDLER,
    level=logging.DEBUG,
    format=LOG_FORMAT
)

async def startup_event():
    app.state.pool = await create_db_pool()
    logging.info("Database pool created")
    print("Database pool created: ", app.state.pool)
    asyncio.create_task(schedule_verifier_cleanup(app.state.pool))

async def schedule_verifier_cleanup(pool):
    while True:
        await delete_old_verifiers(pool)
        await asyncio.sleep(600)
