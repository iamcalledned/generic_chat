import pymysql
import aiomysql
from config import Config

async def create_db_pool():
    return await aiomysql.create_pool(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        db=Config.DB_NAME,
        charset="utf8mb4",
        autocommit=True,
    )

async def get_data_from_db(session_id, pool):
    async with pool.acquire() as conn:
        async with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            await cursor.execute("SELECT * FROM userdata WHERE session_id=%s", (session_id,))
            result = await cursor.fetchone()
            return result

async def delete_old_verifiers(pool):
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("DELETE FROM code_verifier WHERE created_at < NOW() - INTERVAL 10 MINUTE")
            await conn.commit()
