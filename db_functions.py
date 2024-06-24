import os
import asyncio
import aiomysql
import datetime
import uuid
from config import Config
import pymysql
import base64
import hashlib
import jwt
from jwt.algorithms import RSAAlgorithm
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import json
from datetime import datetime
import datetime




# Define the DB_CONFIG directly here or use a separate configuration file
DB_CONFIG = {
    "host": Config.DB_HOST,
    "port": Config.DB_PORT,
    "user": Config.DB_USER,
    "password": Config.DB_PASSWORD,
    "db": Config.DB_NAME,
}

pool = None
#added tweet database
async def insert_tweet(pool, tweet_id, tweet_text, created_at):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''INSERT INTO tweets (tweet_id, tweet_text, created_at) VALUES (%s, %s, %s)'''
            await cur.execute(sql, (tweet_id, tweet_text, created_at))
            await conn.commit()
            print("Tweet inserted successfully")

async def create_db_pool():
    return await aiomysql.create_pool(
        host=Config.DB_HOST, port=Config.DB_PORT,
        user=Config.DB_USER, password=Config.DB_PASSWORD,
        db=Config.DB_NAME, charset='utf8',
        cursorclass=aiomysql.DictCursor, autocommit=True
    )

async def get_user_info_by_session_id(session_id, pool):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM user_data WHERE current_session_id = %s", (session_id,))
            result = await cur.fetchone()
            return result
        
async def clear_user_session_id(pool, session_id):
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            # Update the user_data table to clear the current_session_id
            sql_update = "UPDATE user_data SET current_session_id = NULL WHERE current_session_id = %s"
            await cursor.execute(sql_update, (session_id,))
            await conn.commit()
            print("Cleared session ID for user")

       


async def insert_thread(pool, thread_id, userID, is_active, created_time, persona):
    """Insert a new thread into the threads table"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''INSERT INTO threads(ThreadID, UserID, IsActive, CreatedTime, persona)
                     VALUES(%s, %s, %s, %s, %s)'''
            await cur.execute(sql, (thread_id, userID, is_active, created_time, persona))
            await conn.commit()

async def get_active_thread_for_user(pool, userID, persona):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''
                SELECT ThreadID 
                FROM threads 
                WHERE UserID = %s 
                AND persona = %s 
                AND IsActive = 1
                ORDER BY CreatedTime DESC 
                LIMIT 1
            '''
            await cur.execute(sql, (userID, persona))
            return await cur.fetchone()
        
async def get_active_thread_for_delete(pool, userID, persona):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''
                SELECT  ThreadID
                       ,createdTime 
                FROM threads 
                WHERE UserID = %s 
                AND persona = %s 
                AND IsActive = 1
                ORDER BY CreatedTime DESC 
                         '''
            await cur.execute(sql, (userID, persona))
            return await cur.fetchone()


async def deactivate_thread(pool, thread_id):
    """Mark a thread as inactive"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''UPDATE threads SET IsActive = 0 WHERE ThreadID = %s'''
            await cur.execute(sql, (thread_id,))
            await conn.commit()

async def insert_conversation(pool, userID, thread_id, run_id, message, message_type, ip_address, persona):
    """Insert a new conversation record into the conversations table"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''INSERT INTO conversations(UserID, ThreadID, RunID, Message, MessageType, IPAddress, persona)
                     VALUES(%s, %s, %s, %s, %s, %s, %s)'''
            await cur.execute(sql, (userID, thread_id, run_id, message, message_type, ip_address, persona))
            await conn.commit()

async def get_conversations_by_run(pool, run_id):
    """Fetch all conversations for a given RunID"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''SELECT * FROM conversations WHERE RunID = %s'''
            await cur.execute(sql, (run_id,))
            return await cur.fetchall()

async def get_recent_messages(pool, user_id, persona, threadID, limit=10):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''
            SELECT Message, MessageType, Timestamp  FROM conversations
            WHERE userID = %s
            AND   persona = %s
            AND   ThreadID = %s
            ORDER BY Timestamp DESC
            LIMIT %s;
            '''
            await cur.execute(sql, (user_id, persona, threadID, limit))
            rows = await cur.fetchall()
            # Convert each row to a dict and format datetime objects
            recent_messages = []
            for row in rows:
                message = row['Message']
                try:
                    # Attempt to parse the message as JSON
                    message_data = json.loads(message)
                    message_type = message_data.get('type')
                except json.JSONDecodeError:
                    # If it's not JSON, leave the message as is
                    message_type = 'message'

                # Append the processed message to the list
                recent_messages.append({
                    'Message': message,
                    'MessageType': row['MessageType'],
                    'Timestamp': row['Timestamp'].isoformat(),
                    'ContentType': message_type
                })

            return recent_messages, message_type
            
        
async def get_messages_before(pool, user_id, last_loaded_timestamp, threadID, limit=3):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''
            SELECT Message, MessageType, Timestamp  FROM conversations
            WHERE userID = %s 
            AND Timestamp < %s
            and ThreadID = %s
            ORDER BY Timestamp DESC
            LIMIT %s;
            '''
            await cur.execute(sql, (user_id, last_loaded_timestamp, threadID, limit))
            rows = await cur.fetchall()
            # Convert rows to dictionaries and format datetime
            return [dict(row, Timestamp=row['Timestamp'].isoformat()) for row in rows]

async def update_conversation_status(pool, conversation_id, new_status):
    """Update the status of a conversation"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''UPDATE conversations SET Status = %s WHERE ConversationID = %s'''
            await cur.execute(sql, (new_status, conversation_id))
            await conn.commit()

async def start_new_run(pool, userID, thread_id):
    """Start a new run and return its RunID"""
    run_id = str(uuid.uuid4())
    current_time = datetime.datetime.now().isoformat()
    await insert_thread(pool, thread_id, userID, True, current_time)
    return run_id

async def end_run(pool, run_id):
    """Mark a run as completed"""
    # Logic to mark a run as completed, e.g., updating a runs table or updating conversation statuses
    pass


async def get_user_id(pool, username):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT userID FROM user_data WHERE username = %s", (username,))
            result = await cur.fetchone()
            return result['userID'] if result else None


async def save_recipe_to_db(pool, userID, recipe_data):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            save_result = None
            # Insert into recipes table
            add_recipe = """
                INSERT INTO recipes (userID, title, servings, prep_time, cook_time, total_time)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            await cur.execute(add_recipe, (userID, recipe_data["title"], recipe_data["servings"], 
                                           recipe_data["prep_time"], recipe_data["cook_time"], recipe_data["total_time"]))
            recipe_id = cur.lastrowid  # Get the ID of the inserted recipe

            # Insert ingredients
            add_ingredient = "INSERT INTO ingredients (recipe_id, item, category) VALUES (%s, %s, %s)"
            for ingredient in recipe_data["ingredients"]:
                await cur.execute(add_ingredient, (recipe_id, ingredient["item"], ingredient.get("category")))

            # Insert instructions
            add_instruction = "INSERT INTO instructions (recipe_id, step_number, description) VALUES (%s, %s, %s)"
            for index, step in enumerate(recipe_data["instructions"], start=1):
                await cur.execute(add_instruction, (recipe_id, index, step))

            await conn.commit()
            save_result = 'success'
        return save_result, recipe_id
            
async def favorite_recipe(pool, userID, recipe_id):
    print("called favorite_recipe")
    current_time = datetime.datetime.now().isoformat()
    save_result = None
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = '''INSERT INTO favorite_recipes (userID, recipe_id, saved_time)
                     VALUES(%s, %s, %s)'''
            await cur.execute(sql, (userID, recipe_id, current_time))
            await conn.commit()
            save_result = 'success'
            return save_result
        
async def un_favorite_recipe(pool, userID, recipe_id):
    print("removing favorite")
    remove_result = None
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Use DELETE statement to remove the recipe from favorites
            sql = '''DELETE FROM favorite_recipes 
                     WHERE userID = %s AND recipe_id = %s'''
            await cur.execute(sql, (userID, recipe_id))
            await conn.commit()
            # You might want to return the number of affected rows to check if the delete was successful
            remove_result = cur.rowcount
            return remove_result
        
        
async def get_saved_recipes_for_user(pool, user_id):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # SQL query to fetch the user's saved recipes by joining with the recipes table
            sql = """
                SELECT r.recipe_id, r.title 
                FROM recipes r
                INNER JOIN favorite_recipes f ON r.recipe_id = f.recipe_id
                WHERE f.userID = %s
            """
            await cur.execute(sql, (user_id,))
            saved_recipes = await cur.fetchall()
            return saved_recipes

# Save the code_verifier and state in the database
async def save_code_verifier(pool, state: str, code_verifier: str, client_ip: str, login_timestamp ):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("INSERT INTO verifier_store (state, code_verifier, client_ip, login_timestamp) VALUES (%s, %s, %s, %s)", (state, code_verifier, client_ip, login_timestamp))

# Retrieve the code_verifier using the state
async def get_code_verifier(pool, state: str) -> str:
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT code_verifier FROM verifier_store WHERE state = %s", (state,))
            result = await cur.fetchone()
            return result['code_verifier'] if result else None
        
# delete the code verifier
async def delete_code_verifier(pool, state: str) -> str:
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("delete FROM verifier_store WHERE state = %s", (state,))
            
            
            

#gnerate code and challenge code
async def generate_code_verifier_and_challenge():
    code_verifier = base64.urlsafe_b64encode(os.urandom(40)).decode('utf-8')
    code_challenge = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(code_challenge).decode('utf-8').replace('=', '').replace('+', '-').replace('/', '_')
    return code_verifier, code_challenge


#get all data from DB
async def get_data_from_db(session_id, pool):
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM login WHERE session_id = %s", (session_id,))
            result = await cur.fetchone()
            return result if result else {}



async def save_user_info_to_userdata(pool, session):
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            sql_check = "SELECT username FROM user_data WHERE username = %s"
            await cursor.execute(sql_check, (session['username'],))
            username = await cursor.fetchone()

            if username:
                # If the user exists, update the last_login_date and current_session_id
                sql_update = "UPDATE user_data SET last_login_date = NOW(), current_session_id = %s WHERE username = %s"
                await cursor.execute(sql_update, (session['session_id'], username['username']))
            else:
                # Insert new user with current_session_id
                sql = "INSERT INTO user_data (username, email, name, setup_date, last_login_date, current_session_id) VALUES (%s, %s, %s, NOW(), NOW(), %s)"
                values = (session['username'], session['email'], session['name'], session['session_id'])
                await cursor.execute(sql, values)
                print("inserted new user", session['username'])

            await conn.commit()


async def create_tables(pool):
    """Create tables"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            create_users_table = """CREATE TABLE IF NOT EXISTS users (
                UserID INT AUTO_INCREMENT PRIMARY KEY,
                Username VARCHAR(255) UNIQUE NOT NULL
            );"""

            create_threads_table = """CREATE TABLE IF NOT EXISTS threads (
                ThreadID VARCHAR(36) PRIMARY KEY,
                UserID INT NOT NULL,
                IsActive BOOLEAN NOT NULL,
                CreatedTime DATETIME NOT NULL,
                FOREIGN KEY (UserID) REFERENCES users (UserID)
            );"""

            create_conversations_table = """CREATE TABLE IF NOT EXISTS conversations (
                ConversationID INT AUTO_INCREMENT PRIMARY KEY,
                UserID INT NOT NULL,
                ThreadID VARCHAR(36) NOT NULL,
                RunID VARCHAR(36) NOT NULL,
                Message TEXT NOT NULL,
                Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                MessageType VARCHAR(255) NOT NULL,
                IPAddress VARCHAR(255),
                Status VARCHAR(255) DEFAULT 'active',
                FOREIGN KEY (UserID) REFERENCES users (UserID),
                FOREIGN KEY (ThreadID) REFERENCES threads (ThreadID)
            );"""

            create_user_table = """CREATE TABLE IF NOT EXISTS user_data (
                                user_id INT AUTO_INCREMENT PRIMARY KEY,
                                username VARCHAR(255) UNIQUE NOT NULL,
                                email VARCHAR(255),
                                name VARCHAR(255),
                                setup_date DATETIME,
                                last_login_date DATETIME
                                );"""
            
            await cur.execute(create_users_table)
            await cur.execute(create_threads_table)
            await cur.execute(create_conversations_table)
            await cur.execute(create_user_table)

async def insert_user(pool, username):
    print("username:", username)
    """Insert a new user into the users table or update last login timestamp of an existing user."""
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Check if user already exists
            sql_check = '''SELECT UserID FROM users WHERE Username = %s'''
            await cur.execute(sql_check, (username,))
            existing_user = await cur.fetchone()

            current_ts = datetime.datetime.now()  # Current timestamp

            if existing_user:
                # Update last_login_ts for existing user
                sql_update = '''UPDATE users SET last_login_ts = %s WHERE Username = %s'''
                await cur.execute(sql_update, (current_ts, username))
                await conn.commit()
                return existing_user  # Return the existing user's ID

            # Insert new user if not existing
            sql_insert = '''INSERT INTO users(Username, user_created_ts, last_login_ts) VALUES(%s, %s, %s)'''
            await cur.execute(sql_insert, (username, current_ts, current_ts))
            await conn.commit()
            return cur.lastrowid  # Return the new user's ID

async def delete_old_verifiers(pool):
    print("trying to delete old veriiers")
    async with pool.acquire() as conn:
        print("we have the pool")
        async with conn.cursor() as cur:
            one_hour_ago = datetime.datetime.now() - datetime.timedelta(hours=1)
            print("one hour ago:", one_hour_ago)
            await cur.execute("DELETE FROM verifier_store WHERE login_timestamp < %s", (one_hour_ago,))





