import { initializeWebSocket } from './websocket.js';
import { addEventListeners } from './eventListeners.js';
import { showTypingIndicator, hideTypingIndicator, clearMessages } from './ui.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    addEventListeners();
    hideTypingIndicator();
});
