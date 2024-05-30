//websocket.js
import { handleWebSocketMessage } from './eventHandlers.js';

const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;

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
            handleWebSocketMessage(msg);
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

function sendMessage(message) {
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message }));
        return true;
    } else {
        console.error('WebSocket is not open. ReadyState:', socket.readyState);
        return false;
    }
}

export { initializeWebSocket, sendMessage, socket };
