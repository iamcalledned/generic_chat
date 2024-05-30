import { initializeWebSocket } from 'js/websocket.js';
import 'js/eventHandlers.js';
import { hideTypingIndicator } from 'js/uiHelpers.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    hideTypingIndicator();
});
