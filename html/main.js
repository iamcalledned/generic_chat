import { initializeWebSocket, sendPersona } from './websocket.js';
import './eventHandlers.js';
import { hideTypingIndicator } from './uiHelpers.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    hideTypingIndicator();
});

// Attach sendPersona to the window object
window.sendPersona = sendPersona;
