# Description: This file contains utility functions to create a new thread in OpenAI and check if a thread is valid.
from openai import OpenAI
import sys
import os
# Get the directory of the current script
current_script_path = os.path.dirname(os.path.abspath(__file__))
# Set the path to the parent directory (one folder up)
parent_directory = os.path.dirname(current_script_path)
# Add the config directory to sys.path
sys.path.append(os.path.join(parent_directory, 'database'))
sys.path.append(os.path.join(parent_directory, 'config'))
from config import Config

OPENAI_API_KEY = Config.OPENAI_API_KEY

# Initialize OpenAI client
openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)

async def create_thread_in_openai():
    try:
        thread_response = openai_client.conversation_create()
        thread_id_n = thread_response['id']
        return thread_id_n
    except Exception as e:
        print(f"Error in creating thread: {e}")
        return None

async def is_thread_valid(thread_id):
    try:
        my_thread = openai_client.conversation_retrieve(thread_id)
        return True  # Assuming the thread is valid if no exception occurred
    except Exception as e:
        print(f"Error checking thread validity: {e}")
        return False
