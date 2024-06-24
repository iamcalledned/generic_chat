import json
from db_functions import get_user_id, get_active_thread_for_user, get_recent_messages
from utilities import format_response
from openai_utils_generate_answer import processed_content

async def handle_select_persona(websocket, data_dict, pool, username):
    persona = data_dict.get('persona')
    userID = await get_user_id(pool, username)
    active_thread = await get_active_thread_for_user(pool, userID, persona)
    if active_thread:
        threadID = active_thread['ThreadID']
        recent_messages = await get_recent_messages(pool, userID, persona, threadID)
        print(recent_messages)
    try:
        response_json = json.loads(processed_content)
        content_type = response_json.get('type', 'other')
        print("content type:", content_type)    
    except json.JSONDecodeError:
        response_json = {"type": "message", "message": processed_content}
        content_type = "message"
        print("processed content:", processed_content)

        formatted_messages = await format_response(recent_messages, content_type)
        await websocket.send_text(json.dumps({
            'action': 'recent_messages',
            'messages': recent_messages
        }))
