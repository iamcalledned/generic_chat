//event_hander.js
import { socket, sendMessage } from './websocket.js';
import { showTypingIndicator, hideTypingIndicator, clearMessages, displayRecentMessages, displayMoreMessages, scrollToBottom } from './ui.js';

function handleWebSocketMessage(msg) {
    if (msg.action === 'ping') {
        socket.send(JSON.stringify({ action: 'pong' }));
    } else if (msg.action === 'recent_messages') {
        displayRecentMessages(msg.messages, persona);
    } else if (msg.action === 'older_messages') {
        displayMoreMessages(msg.messages, persona);
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
        scrollToBottom();
    }
}

function attachEventHandlers() {
    document.querySelector('.hamburger-menu').addEventListener('click', function() {
        document.querySelector('.options-menu').classList.toggle('show');
        document.querySelector('.hamburger-menu').classList.toggle('active');
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

    document.getElementById('send-button').addEventListener('click', handleSendMessage);
    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.which === 13) {
            handleSendMessage();
            return false;
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
}

function handleSendMessage() {
    const message = document.getElementById('message-input').value;
    if (sendMessage(message)) {
        document.getElementById('message-input').value = '';
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.textContent = 'You: ' + message;
        document.getElementById('messages').appendChild(messageElement);
        showTypingIndicator(persona);
        scrollToBottom();
    }
}

function loadMoreMessages() {
    const lastMessageTimestamp = getOldestMessageTimestamp();
    if (lastMessageTimestamp && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'load_more_messages',
            last_loaded_timestamp: lastMessageTimestamp
        }));
    }
}

function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.dataset.timestamp : null;
}

export { attachEventHandlers, handleWebSocketMessage };
