const WEBSOCKET_URL = 'ws://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

document.querySelector('.hamburger-menu').addEventListener('click', function() {
    document.querySelector('.options-menu').classList.toggle('show');
    document.querySelector('.hamburger-menu').classList.toggle('active');
});

document.getElementById('logout').addEventListener('click', function() {
    sessionStorage.clear();
    window.location.href = '/login';
});

document.getElementById('switch_persona').addEventListener('click', function() {
    document.getElementById('personaSelection').classList.add('show');
    clearMessages(); // Clear old messages when switching persona
});

document.getElementById('closeBtn').addEventListener('click', function() {
    document.getElementById('overlay').style.display = 'none';
});

document.getElementById('deleteSelectedBtn').addEventListener('click', function() {
    const selectedThreadIDs = Array.from(document.querySelectorAll('#threadsList input:checked')).map(input => input.value);
    if (selectedThreadIDs.length > 0) {
        socket.send(JSON.stringify({ action: 'delete_selected_threads', threadIDs: selectedThreadIDs }));
        document.getElementById('overlay').style.display = 'none';
    } else {
        alert('Please select at least one thread to delete.');
    }
});

document.getElementById('clear_conversations').addEventListener('click', function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'clear_conversations' }));
    }
});

function sendPersona() {
    persona = document.getElementById('personaDropdown').value;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'persona_selected',
            persona: persona
        }));
    }
    document.getElementById('typing-text').innerText = persona + ' is typing...';
    document.getElementById('personaSelection').classList.remove('show');
}

function showTypingIndicator() {
    document.getElementById('typing-container').style.display = 'flex';
}

function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear all messages
}

function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        let messageElement;
        if (message.MessageType === 'user') {
            messageElement = document.createElement('div');
            messageElement.className = 'message user';
            messageElement.textContent = 'You: ' + message.Message;
        } else if (message.MessageType === 'bot') {
            messageElement = document.createElement('div');
            messageElement.className = 'message bot';
            messageElement.textContent = persona + ': ' + message.Message;
        } else {
            messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.textContent = message.Message;
        }
        messageElement.dataset.timestamp = message.Timestamp;
        document.getElementById('messages').appendChild(messageElement);
    });
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let messageElement;
        if (message.MessageType === 'user') {
            messageElement = document.createElement('div');
            messageElement.className = 'message user';
            messageElement.textContent = 'You: ' + message.Message;
        } else if (message.MessageType === 'bot') {
            messageElement = document.createElement('div');
            messageElement.className = 'message bot';
            messageElement.textContent = persona + ': ' + message.Message;
        } else {
            messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.textContent = message.Message;
        }
        messageElement.dataset.timestamp = message.Timestamp;
        document.getElementById('messages').prepend(messageElement);
    });
}

function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.dataset.timestamp : null;
}

function initializeWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = function() {
            socket.send(JSON.stringify({ action: 'load_messages' }));
            reconnectInterval = 1000;
        };

        socket.onclose = function() {
            setTimeout(reconnectWebSocket, reconnectInterval);
            reconnectInterval = Math.min(reconnectInterval * 2, MAX_RECONNECT_INTERVAL);
        };

        socket.onmessage = function(event) {
            const msg = JSON.parse(event.data);
            if (msg.action === 'ping') {
                socket.send(JSON.stringify({ action: 'pong' }));
            } else if (msg.action === 'recent_messages') {
                displayRecentMessages(msg.messages);
            } else if (msg.action === 'older_messages') {
                displayMoreMessages(msg.messages);
            } else if (msg.action === 'force_logout' || msg.action === 'redirect_login') {
                window.location.href = '/login';
            } else if (msg.action === 'select_persona') {
                document.getElementById('personaSelection').classList.add('show');
            } else if (msg.action === 'conversation_list') {
                if (msg.threads) {
                    showOverlay(msg.threads);
                } else {
                    console.error('Threads data is missing from the WebSocket message');
                }
            } else if (msg.action === 'threads_deactivated') {
                console.log('Threads deactivated:', msg.threadIDs);
                window.location.reload();
            } else {
                hideTypingIndicator();
                let messageElement;
                messageElement = document.createElement('div');
                messageElement.className = 'message bot';
                messageElement.innerHTML = msg.response;
                document.getElementById('messages').appendChild(messageElement);
                document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket Error:', error);
        };
    }
}

function showOverlay(threads) {
    const threadsList = document.getElementById('threadsList');
    threadsList.innerHTML = ''; // Clear any existing content

    threads.forEach(thread => {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = thread.threadID;

        const label = document.createElement('label');
        label.textContent = `Thread ID: ${thread.threadID}, Created Time: ${thread.createdTime}`;

        threadItem.appendChild(checkbox);
        threadItem.appendChild(label);
        threadsList.appendChild(threadItem);
    });

    document.getElementById('overlay').style.display = 'block';
}

function reconnectWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        initializeWebSocket();
    }
}

function loadMoreMessages() {
    const lastMessageTimestamp = getOldestMessageTimestamp();
    if (lastMessageTimestamp && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'load_more_messages',
            last_loaded_timestamp: lastMessageTimestamp
        }));
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.which === 13) {
            sendMessage();
            return false;
        }
    });
    hideTypingIndicator();

    document.addEventListener('click', function (event) {
        const hamburgerMenu = document.querySelector('.hamburger-menu');
        const optionsMenu = document.querySelector('.options-menu');
        if (!hamburgerMenu.contains(event.target) && !optionsMenu.contains(event.target)) {
            optionsMenu.classList.remove('show');
            hamburgerMenu.classList.remove('active');
        }
    });

    
    document.getElementById('messages').addEventListener('scroll', function () {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });
});

function sendMessage() {
    const message = document.getElementById('message-input').value;
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message }));
        document.getElementById('message-input').value = '';
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.textContent = 'You: ' + message;
        document.getElementById('messages').appendChild(messageElement);
        showTypingIndicator();
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    } else {
        console.error('WebSocket is not open. ReadyState:', socket.readyState);
    }
}
