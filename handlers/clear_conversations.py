import json
from db_functions import get_user_id, get_active_thread_for_delete, deactivate_thread

async def handle_clear_conversations(websocket, data_dict, pool, username):
    userID = await get_user_id(pool, username)
    active_thread = await get_active_thread_for_delete(pool, userID, data_dict.get('persona'))
    if active_thread:
        threadID = active_thread['ThreadID']
        createdTime = active_thread['createdTime'].isoformat()  # Convert datetime to string
        await websocket.send_text(json.dumps({
            'action': 'conversation_list',
            'threads': [{
                'threadID': threadID,
                'createdTime': createdTime
            }]
        }))
    else:
        await websocket.send_text(json.dumps({
            'action': 'conversation_list',
            'threads': []
        }))
