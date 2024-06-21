import json
from db_functions import deactivate_thread

async def handle_delete_selected_threads(websocket, data_dict, pool, username):
    thread_ids = data_dict['threadIDs']
    for thread_id in thread_ids:
        await deactivate_thread(pool, thread_id)
    await websocket.send_text(json.dumps({
        'action': 'threads_deactivated',
        'threadIDs': thread_ids
    }))
