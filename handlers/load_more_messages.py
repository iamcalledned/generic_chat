import json
from db_functions import get_user_id, get_active_thread_for_user, get_messages_before

async def handle_load_more_messages(websocket, data_dict, pool, username, persona):
    userID = await get_user_id(pool, username)
    last_loaded_timestamp = data_dict.get('last_loaded_timestamp')
    active_thread = await get_active_thread_for_user(pool, userID, persona)
    threadID = active_thread['ThreadID']
    older_messages = await get_messages_before(pool, userID, last_loaded_timestamp, threadID)
    await websocket.send_text(json.dumps({
        'action': 'older_messages',
        'messages': older_messages
    }))
