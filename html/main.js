// main.js
import { initializeWebSocket } from './websocket.js';
import './eventHandlers.js';
import { hideTypingIndicator } from './uiHelpers.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    hideTypingIndicator();
});
