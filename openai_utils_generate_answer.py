#generate_answer.py
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
import openai

from chat_bot_database import get_active_thread_for_user, insert_thread, insert_conversation, create_db_pool, get_user_id
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
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Initialize OpenAI client
openai.api_key = Config.OPENAI_API_KEY

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
                if thread_id_n:
                    current_time = datetime.datetime.now().isoformat()
                    await insert_thread(pool, thread_id_n, userID, True, current_time, persona)
                else:
                    print("Error: Failed to create a new thread in OpenAI.")
                    return "Error: Failed to create a new thread in OpenAI."
        else:
            print("Key 0 is not present in active_thread.")
    else:
        print("No active thread found for userID:", userID, "Creating a new thread.")
        thread_id_n = await create_thread_in_openai()
        if thread_id_n:
            current_time = datetime.datetime.now().isoformat()
            await insert_thread(pool, thread_id_n, userID, True, current_time, persona)
        else:
            print("Error: Failed to create a new thread in OpenAI.")
            return "Error: Failed to create a new thread in OpenAI."

    if thread_id_n:
        response_text = await send_message(thread_id_n, message)

        assistant_id_persona = Config.PERSONA_ASSISTANT_MAPPING.get(persona)
        print('assistant id:', assistant_id_persona)
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": message}]
        )

        print('created response')
        if response:
            await insert_conversation(pool, userID, thread_id_n, response['id'], message, 'user', user_ip, persona)
            print('done with insert')

            while True:
                response = openai.ChatCompletion.retrieve(id=response['id'])

                if response['status'] == "completed":
                    print("Response completed. Message:", response['status'])
                    break
                elif response['status'] == "error":
                    print("Response error", response['status'])
                    break

                await asyncio.sleep(1)

            messages = openai.ChatCompletion.list(id=thread_id_n)
            message_content = messages['choices'][0]['message']['content']

            content_type = "other"

            await insert_conversation(pool, userID, thread_id_n, response['id'], message_content, 'bot', None, persona)
            print("saved conversations for user:", userID)
        else:
            print("Failed to create a response object in OpenAI.")
            return "Error: Failed to create a response object."
        recipe_id = None
        return message_content, content_type, recipe_id
    else:
        return "Error: Failed to create a new thread in OpenAI."
