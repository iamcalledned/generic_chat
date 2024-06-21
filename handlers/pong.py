async def handle_pong(websocket, redis_client, session_id):
    redis_client.expire(session_id, 3600)  # Reset expiry to another hour
