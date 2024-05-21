#openai_utils_new_thread.py
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
        response = openai_client.chat_completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "New thread initialization"}]
        )
        thread_id_n = response['id']
        return thread_id_n
    except Exception as e:
        print(f"Error in creating thread: {e}")
        return None

async def is_thread_valid(thread_id):
    try:
        my_thread = openai_client.chat_completions.retrieve(id=thread_id)
        return True
    except Exception as e:
        print(f"Error checking thread validity: {e}")
        return False
