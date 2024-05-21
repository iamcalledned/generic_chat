# generate_answer.py
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
import json


# Other imports as necessary
OPENAI_API_KEY = Config.OPENAI_API_KEY


log_file_path = '/home/ned/projects/generic_chat/generate_answer_logs.txt'
logging.basicConfig(
    filename=log_file_path,
    level=logging.DEBUG,  # Adjust the log level as needed (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Initialize OpenAI client

openai_client = OpenAI()
openai_client.api_key = Config.OPENAI_API_KEY
client = OpenAI()

def process_message_content(raw_message):
    content = raw_message['content'][0]['text']['value']
    annotations = raw_message['content'][0]['text']['annotations']

    # Sort annotations by start_index in descending order to avoid indexing issues during replacement
    annotations.sort(key=lambda x: x['start_index'], reverse=True)

    for annotation in annotations:
        if annotation['type'] == 'file_citation':
            citation_text = annotation['text']
            file_id = annotation['file_citation']['file_id']
            link = f'<a href="/path/to/your/files/{file_id}">{citation_text}</a>'
            start_index = annotation['start_index']
            end_index = annotation['end_index']
            content = content[:start_index] + content[end_index:]
    
    return content

async def generate_answer(pool, username, message, user_ip, uuid, persona):  # Add db_pool parameter
    # Use your new database module to create a connection
    print("username:", username)
    #userID = await insert_user(pool, userID)
    userID = await get_user_id(pool, username)
    print("userID", userID)

    active_thread = await get_active_thread_for_user(pool, userID, persona)

    if active_thread:
        thread_id_n = active_thread['ThreadID']  # Use .get() method to safely access the key
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

        # Create the run on OpenAI
        assistant_id_persona = Config.PERSONA_ASSISTANT_MAPPING.get(persona)
        print('assistant id:', assistant_id_persona)
        run = client.beta.threads.runs.create(
            thread_id=thread_id_n,
            assistant_id=assistant_id_persona
        )

        print('created run')
        if run is not None:
            # Now we have a run ID, we can log the user's message
            await insert_conversation(pool, userID, thread_id_n, run.id, message, 'user', user_ip, persona)  # Replace 'user_ip' with actual IP if available
            print('done with insert')
            while True:
                run = client.beta.threads.runs.retrieve(
                    thread_id=thread_id_n,
                    run_id=run.id
                )

                if run.status == "completed":
                    print("Run completed. Message:", run.status)
                    break
                elif run.status == "error":
                    print("Run error", run.status)
                    break

                await asyncio.sleep(1)   # Wait for 1 second before the next status check

            messages = client.beta.threads.messages.list(
                thread_id=thread_id_n
            )
            message_content = messages.data[0].content[0].text.value
            
            # Convert to a serializable format
            raw_json = [message.to_dict() for message in messages.data]
            first_message = raw_json[0]
            print("first message:", first_message)

            # Process the message content to replace citations with links
            processed_content = process_message_content(first_message)
            
            content_type = "other"

            # Log OpenAI's response
            await insert_conversation(pool, userID, thread_id_n, run.id, processed_content, 'bot', None, persona)  # Same here for IP
            print("saved conversations for user:", userID)
        else:
            print("Failed to create a run object in OpenAI.")
            return "Error: Failed to create a run object."
        recipe_id = None
        return processed_content, content_type, recipe_id
    else:
        return "Error: Failed to create a new thread in OpenAI."
