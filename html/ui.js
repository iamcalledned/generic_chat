export function showTypingIndicator() {
    document.getElementById('typing-container').style.display = 'flex';
}

export function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

export function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear all messages
}

export function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        let messageElement = document.createElement('div');
        let formattedContent = formatMessageContent(message.Message);

        if (message.MessageType === 'user') {
            messageElement.className = 'message user';
            messageElement.innerHTML = `<p>You: ${formattedContent}</p>`;
        } else if (message.MessageType === 'bot') {
            messageElement.className = 'message bot';
            messageElement.innerHTML = `<p>Ned: ${formattedContent}</p>`;
        } else {
            messageElement.className = 'message';
            messageElement.innerHTML = formattedContent;
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').appendChild(messageElement);
    });

    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

export function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let messageElement = document.createElement('div');
        let formattedContent = formatMessageContent(message.Message);

        if (message.MessageType === 'user') {
            messageElement.className = 'message user';
            messageElement.innerHTML = `<p>You: ${formattedContent}</p>`;
        } else if (message.MessageType === 'bot') {
            messageElement.className = 'message bot';
            messageElement.innerHTML = `<p>Ned: ${formattedContent}</p>`;
        } else {
            messageElement.className = 'message';
            messageElement.innerHTML = formattedContent;
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').prepend(messageElement);
    });
}

export function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.getAttribute('data-timestamp') : null;
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
