import { createMessageElement } from './ui.js';

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
        let formattedContent = formatMessageContent(message.Message);
        let messageElement;
        
        if (message.MessageType === 'user') {
            formattedContent = `You: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'user');
        } else if (message.MessageType === 'bot') {
            formattedContent = `Ned: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'bot');
        } else {
            messageElement = createMessageElement(formattedContent, '');
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').appendChild(messageElement);
    });

    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

export function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let formattedContent = formatMessageContent(message.Message);
        let messageElement;
        
        if (message.MessageType === 'user') {
            formattedContent = `You: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'user');
        } else if (message.MessageType === 'bot') {
            formattedContent = `Ned: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'bot');
        } else {
            messageElement = createMessageElement(formattedContent, '');
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

export function formatMessageContent(message) {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        } catch (e) {
            return `<p>${message}</p>`;
        }
    }
    if (message.type === 'recipe') {
        let responseText = `<div class='recipe-container'><h2>A recipe for: ${message.title}</h2>`;
        responseText += `<p><strong>Prep time:</strong> ${message.prep_time}</p>`;
        responseText += `<p><strong>Cook time:</strong> ${message.cook_time}</p>`;
        responseText += `<p><strong>Total time:</strong> ${message.total_time}</p>`;
        responseText += `<p><strong>Servings:</strong> ${message.servings}</p>`;
        responseText += "<h3>Ingredients:</h3><ul>";
        responseText += message.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('');
        responseText += "</ul>";
        responseText += "<h3>Instructions:</h3><ol>";
        responseText += message.instructions.map(instruction => `<li>${instruction}</li>`).join('');
        responseText += "</ol>";
        responseText += "<button class='print-recipe-button' onclick='printRecipe(this)'>Print Recipe</button></div>";
        return responseText;
    } else if (message.type === 'shopping_list') {
        let responseText = "<h2>Shopping List:</h2>";
        for (const [department, items] of Object.entries(message.departments)) {
            responseText += `<h3>${department}</h3><ul>`;
            responseText += items.map(item => `<li>${item}</li>`).join('');
            responseText += "</ul>";
        }
        return responseText;
    } else {
        return `<p>${message.message}</p>`;
    }
}
export function createMessageElement(content, messageType) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageType}`;
    messageElement.innerHTML = `<p>${content}</p>`;
    return messageElement;
}

