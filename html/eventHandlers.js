// eventHandlers.js
import { initializeWebSocket, sendPersona, sendMessage } from './websocket.js';
import { clearMessages, loadMoreMessages, showOverlay, hideTypingIndicator } from './uiHelpers.js';

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    document.getElementById('send-button').addEventListener('click', () => {
        const message = document.getElementById('message-input').value;
        sendMessage(message);
        document.getElementById('message-input').value = '';
    });

    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.which === 13) {
            const message = document.getElementById('message-input').value;
            sendMessage(message);
            document.getElementById('message-input').value = '';
            return false;
        }
    });

    document.getElementById('logout').addEventListener('click', function() {
        sessionStorage.clear();
        window.location.href = '/login';
    });

    document.getElementById('switch_persona').addEventListener('click', function() {
        document.getElementById('personaSelection').classList.add('show');
        clearMessages();
    });

    document.getElementById('closeBtn').addEventListener('click', function() {
        document.getElementById('overlay').style.display = 'none';
    });

    document.getElementById('deleteSelectedBtn').addEventListener('click', function() {
        const selectedThreadIDs = Array.from(document.querySelectorAll('#threadsList input:checked')).map(input => input.value);
        if (selectedThreadIDs.length > 0) {
            socket.send(JSON.stringify({ action: 'delete_selected_threads', threadIDs: selectedThreadIDs }));
            document.getElementById('overlay').style.display = 'none';
        } else {
            alert('Please select at least one thread to delete.');
        }
    });

    document.getElementById('clear_conversations').addEventListener('click', function() {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'clear_conversations' }));
        }
    });

    document.getElementById('messages').addEventListener('scroll', function () {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });

    document.addEventListener('click', function (event) {
        const hamburgerMenu = document.querySelector('.hamburger-menu');
        const optionsMenu = document.querySelector('.options-menu');
        if (!hamburgerMenu.contains(event.target) && !optionsMenu.contains(event.target)) {
            optionsMenu.classList.remove('show');
            hamburgerMenu.classList.remove('active');
        }
    });

    hideTypingIndicator();
});
