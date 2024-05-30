const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

export function initializeWebSocket() {
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
            handleWebSocketMessage(event);
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

function handleWebSocketMessage(event) {
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
        let messageElement = document.createElement('div');
        messageElement.className = 'message bot';
        messageElement.innerHTML = msg.response;
        document.getElementById('messages').appendChild(messageElement);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
}

export function sendPersona(selectedPersona) {
    persona = selectedPersona;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'persona_selected',
            persona: persona
        }));
    }
    document.getElementById('typing-text').innerText = persona + ' is typing...';
    document.getElementById('personaSelection').classList.remove('show');
}

export function sendMessage(message) {
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message }));
        showUserMessage(message);
    } else {
        console.error('WebSocket is not open. ReadyState:', socket.readyState);
    }
}

function showUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.textContent = 'You: ' + message;
    document.getElementById('messages').appendChild(messageElement);
    showTypingIndicator();
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}
