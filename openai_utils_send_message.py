from openai import OpenAI
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
from config import Config

OPENAI_API_KEY = Config.OPENAI_API_KEY

# Initialize OpenAI client
openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)

#send the message    
async def send_message(thread_id_n, message):
    try:
        response = openai_client.chat_create(
            model="gpt-4",
            messages=[
                {"role": "user", "content": message}
            ],
            thread_id=thread_id_n
        )
        # Extracting the response text from the response
        response_text = response['choices'][0]['message']['content']
       
        return response_text
    except Exception as e:
        print(f"Error in sending message: {e}")
        return "Error in sending message."
