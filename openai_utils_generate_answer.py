import time
import sys
import os
# Get the directory of the current script
current_script_path = os.path.dirname(os.path.abspath(__file__))
# Set the path to the parent directory (one folder up)
parent_directory = os.path.dirname(current_script_path)
# Add the config directory to sys.path
sys.path.append(os.path.join(parent_directory, 'database'))
sys.path.append(os.path.join(parent_directory, 'config'))
from openai_utils_new_thread import create_thread_in_openai, is_thread_valid
from openai_utils_send_message import send_message
from openai import OpenAI

from chat_bot_database import get_active_thread_for_user, insert_thread, insert_conversation, create_db_pool ,get_user_id
import datetime
import logging
import asyncio
import aiomysql 
from config import Config
import re

# Other imports as necessary
OPENAI_API_KEY = Config.OPENAI_API_KEY

log_file_path = '/home/ned/projects/generic_chat/generate_answer_logs.txt'
logging.basicConfig(
    filename=log_file_path,
    level=logging.DEBUG,  # Adjust the log level as needed (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Initialize OpenAI client
openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
client = OpenAI(api_key=Config.OPENAI_API_KEY)

async def generate_answer(pool, username, message, user_ip, uuid, persona):
    print("username:", username)
    userID = await get_user_id(pool, username)
    print("userID", userID)

    active_thread = await get_active_thread_for_user(pool, userID, persona)

    if active_thread:
        thread_id_n = active_thread.get('ThreadID')
        if thread_id_n:
            if await is_thread_valid(thread_id_n):
                print("Thread is valid. Continuing with Thread ID:", thread_id_n)
            else:
                thread_id_n = await create_thread_in_openai()
                current_time = datetime.datetime.now().isoformat()
                await insert_thread(pool, thread_id_n, userID, True, current_time, persona)
        else:
            print("Key 0 is not present in active_thread.")
    else:
        print("No active thread found for userID:", userID, "Creating a new thread.")
        thread_id_n = await create_thread_in_openai()
        current_time = datetime.datetime.now().isoformat()
        await insert_thread(pool, thread_id_n, userID, True, current_time, persona)

    if thread_id_n:
        response_text = await send_message(thread_id_n, message)

        assistant_id_persona = Config.PERSONA_ASSISTANT_MAPPING.get(persona)
        print('assistant id:', assistant_id_persona)
        run = client.conversation_run(
            model="gpt-4",
            thread_id=thread_id_n,
            assistant_id=assistant_id_persona
        )

        print('created run')
        if run is not None:
            await insert_conversation(pool, userID, thread_id_n, run['id'], message, 'user', user_ip, persona)
            print('done with insert')
            while True:
                run = client.conversation_retrieve(
                    thread_id=thread_id_n,
                    run_id=run['id']
                )

                if run['status'] == "completed":
                    print("Run completed. Message:", run['status'])
                    break
                elif run['status'] == "error":
                    print("Run error", run['status'])
                    break

                await asyncio.sleep(1)

            messages = client.conversation_messages_list(
                thread_id=thread_id_n
            )
            message_content = messages['data'][0]['message']['content']

            content_type = "other"

            await insert_conversation(pool, userID, thread_id_n, run['id'], message_content, 'bot', None, persona)
            print("saved conversations for user:", userID)
        else:
            print("Failed to create a run object in OpenAI.")
            return "Error: Failed to create a run object."
        recipe_id = None
        return message_content, content_type, recipe_id
    else:
        return "Error: Failed to create a new thread in OpenAI."
