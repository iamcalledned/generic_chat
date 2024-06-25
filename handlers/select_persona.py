import json
from db_functions import get_user_id, get_active_thread_for_user, get_recent_messages
from utilities import format_response, process_message_content, format_response_table


async def handle_select_persona(websocket, data_dict, pool, username):
    persona = data_dict.get('persona')
    userID = await get_user_id(pool, username)
    active_thread = await get_active_thread_for_user(pool, userID, persona)
    
    recent_messages = []
    content_type = "message"
    
    if active_thread:
        threadID = active_thread['ThreadID']
        recent_messages, content_type = await get_recent_messages(pool, userID, persona, threadID)
        print(recent_messages, content_type)
    
    formatted_messages = [format_response_table(message['Message'], message['ContentType']) for message in recent_messages]
    print("formatted messages:", formatted_messages)
    await websocket.send_text(json.dumps({
        'action': 'recent_messages',
        'messages': formatted_messages
    }))
