//main.js
import { initializeWebSocket } from './websocket.js';
import { attachEventHandlers } from './eventHandlers.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    attachEventHandlers();
});
