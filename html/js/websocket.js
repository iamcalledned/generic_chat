import { clearMessages, displayRecentMessages, displayMoreMessages, hideTypingIndicator, showTypingIndicator, showOverlay, formatMessageContent, getOldestMessageTimestamp, createMessageElement } from './ui.js';
import { printRecipe } from './utilities.js';

const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

window.printRecipe = printRecipe;  // Make printRecipe globally accessible

export function initializeWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = function() {
            console.log('WebSocket connection established');
            reconnectInterval = 1000;
        };

        socket.onclose = function() {
            setTimeout(reconnectWebSocket, reconnectInterval);
            reconnectInterval = Math.min(reconnectInterval * 2, MAX_RECONNECT_INTERVAL);
        };

        socket.onmessage = function(event) {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
        };

        socket.onerror = function(error) {
            console.error('WebSocket Error:', error);
        };
    }
}

function reconnectWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        initializeWebSocket();
    }
}

function handleMessage(msg) {
    console.log("Received message:", msg);
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
        const formattedContent = formatMessageContent(msg.response);
        const messageElement = createMessageElement(formattedContent, 'bot');
        document.getElementById('messages').appendChild(messageElement);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
}

export function sendMessage(message) {
    console.log('sendMessage called with message:', message);
    console.log('socket state:', socket.readyState);
    console.log('persona:', persona);

    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message, persona: persona }));
        document.getElementById('message-input').value = '';
        const formattedContent = `You: ${message}`;
        const messageElement = createMessageElement(formattedContent, 'user');
        console.log(`Appended user message: ${messageElement.outerHTML}`);
        document.getElementById('messages').appendChild(messageElement);
        showTypingIndicator();
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    } else {
        console.error('WebSocket is not open or message is empty. ReadyState:', socket.readyState);
    }
}

export function loadMoreMessages() {
    const lastMessageTimestamp = getOldestMessageTimestamp();
    if (lastMessageTimestamp && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'load_more_messages',
            last_loaded_timestamp: lastMessageTimestamp,
            persona: persona
        }));
    }
}

export function sendPersona() {
    persona = document.getElementById('personaDropdown').value;
    clearMessages();
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'persona_selected',
            persona: persona
        }));
    }
    document.getElementById('typing-text').innerText = persona + ' is typing...';
    document.getElementById('personaSelection').classList.remove('show');
    clearMessages();
}

export function getSocket() {
    return socket;
}

export function getPersona() {
    return persona;
}

// Initialize event listeners when the script loads
document.getElementById('send-button').onclick = () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    if (message.length > 0) {
        sendMessage(message);
        messageInput.value = '';
    }
};

document.getElementById('message-input').onkeypress = (event) => {
    if (event.key === 'Enter') {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        if (message.length > 0) {
            sendMessage(message);
            messageInput.value = '';
        }
        event.preventDefault();
    }
};

initializeWebSocket();
