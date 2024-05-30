//ui.js
function showTypingIndicator(persona) {
    document.getElementById('typing-text').innerText = `${persona} is typing...`;
    document.getElementById('typing-container').style.display = 'flex';
}

function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

function displayRecentMessages(messages, persona) {
    messages.reverse().forEach(function(message) {
        let messageElement = createMessageElement(message, persona);
        document.getElementById('messages').appendChild(messageElement);
    });
    scrollToBottom();
}

function displayMoreMessages(messages, persona) {
    messages.forEach(function(message) {
        let messageElement = createMessageElement(message, persona);
        document.getElementById('messages').prepend(messageElement);
    });
}

function createMessageElement(message, persona) {
    let messageElement = document.createElement('div');
    if (message.MessageType === 'user') {
        messageElement.className = 'message user';
        messageElement.textContent = 'You: ' + message.Message;
    } else if (message.MessageType === 'bot') {
        messageElement.className = 'message bot';
        messageElement.textContent = persona + ': ' + message.Message;
    } else {
        messageElement.className = 'message';
        messageElement.textContent = message.Message;
    }
    messageElement.dataset.timestamp = message.Timestamp;
    return messageElement;
}

function scrollToBottom() {
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

export { showTypingIndicator, hideTypingIndicator, clearMessages, displayRecentMessages, displayMoreMessages, scrollToBottom };
