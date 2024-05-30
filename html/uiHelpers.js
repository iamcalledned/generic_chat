export function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear all messages
}

export function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        appendMessage(message);
    });
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

export function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        prependMessage(message);
    });
}

export function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.dataset.timestamp : null;
}

export function loadMoreMessages() {
    const lastMessageTimestamp = getOldestMessageTimestamp();
    if (lastMessageTimestamp && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'load_more_messages',
            last_loaded_timestamp: lastMessageTimestamp
        }));
    }
}

export function showTypingIndicator() {
    document.getElementById('typing-container').style.display = 'flex';
}

export function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

export function showOverlay(threads) {
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

function appendMessage(message) {
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
}

function prependMessage(message) {
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
}
