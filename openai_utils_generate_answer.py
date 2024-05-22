# generate_answer.py
import time
import sys
import os
import asyncio
import logging
import datetime
from typing_extensions import override
from openai import OpenAI, AssistantEventHandler

# Add necessary paths to sys.path
current_script_path = os.path.dirname(os.path.abspath(__file__))
parent_directory = os.path.dirname(current_script_path)
sys.path.append(os.path.join(parent_directory, 'database'))
sys.path.append(os.path.join(parent_directory, 'config'))

from openai_utils_new_thread import create_thread_in_openai, is_thread_valid
from openai_utils_send_message import send_message
from chat_bot_database import get_active_thread_for_user, insert_thread, insert_conversation, get_user_id
from config import Config

OPENAI_API_KEY = Config.OPENAI_API_KEY
log_file_path = '/home/ned/projects/generic_chat/generate_answer_logs.txt'

logging.basicConfig(
    filename=log_file_path,
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)

# Define the EventHandler class
class EventHandler(AssistantEventHandler):
    @override
    def on_text_created(self, text) -> None:
        print(f"\nassistant > ", end="", flush=True)

    @override
    def on_text_delta(self, delta, snapshot):
        print(delta.value, end="", flush=True)

    def on_tool_call_created(self, tool_call):
        print(f"\nassistant > {tool_call.type}\n", flush=True)

    def on_tool_call_delta(self, delta, snapshot):
        if delta.type == 'code_interpreter':
            if delta.code_interpreter.input:
                print(delta.code_interpreter.input, end="", flush=True)
            if delta.code_interpreter.outputs:
                print(f"\n\noutput >", flush=True)
                for output in delta.code_interpreter.outputs:
                    if output.type == "logs":
                        print(f"\n{output.logs}", flush=True)

async def generate_answer(pool, username, message, user_ip, uuid, persona):
    print("username:", username)
    userID = await get_user_id(pool, username)
    print("userID", userID)

    active_thread = await get_active_thread_for_user(pool, userID, persona)

    if active_thread:
        thread_id_n = active_thread['ThreadID']
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

        with openai_client.beta.threads.runs.stream(
            thread_id=thread_id_n,
            assistant_id=assistant_id_persona,
            event_handler=EventHandler(),
        ) as stream:
            await stream.until_done()

        run = stream.run
        if run is not None:
            await insert_conversation(pool, userID, thread_id_n, run.id, message, 'user', user_ip, persona)
            print('done with insert')

            messages = openai_client.beta.threads.messages.list(thread_id=thread_id_n)
            message_content = messages.data[0].content[0].text.value

            raw_json = [message.to_dict() for message in messages.data]
            first_message = raw_json[0]
            print("first message:", first_message)

            processed_content = process_message_content(first_message)

            content_type = "other"
            await insert_conversation(pool, userID, thread_id_n, run.id, processed_content, 'bot', None, persona)
            print("saved conversations for user:", userID)
        else:
            print("Failed to create a run object in OpenAI.")
            return "Error: Failed to create a run object."
        
        recipe_id = None
        return processed_content, content_type, recipe_id
    else:
        return "Error: Failed to create a new thread in OpenAI."
