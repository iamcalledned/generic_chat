import json
from uuid import uuid4
from openai_utils_generate_answer import generate_answer
from utilities import format_response

async def handle_chat_message(websocket, data_dict, pool, username, client_ip, persona):
    message = data_dict.get('message', '')
    uuid = str(uuid4())
    print("persona from handle_chat_message:", persona)
    response_json, content_type, recipe_id = await generate_answer(pool, username, message, client_ip, uuid, persona)
    response_text = format_response(response_json, content_type)
    response = {
        'response': response_text,
        'type': content_type,
        'recipe_id': recipe_id
    }
    await websocket.send_text(json.dumps(response))
