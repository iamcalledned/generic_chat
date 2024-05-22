const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';

let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

function sendPersona() {
    persona = document.getElementById('personaDropdown').value;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'persona_selected', persona: persona }));
    }
    document.getElementById('typing-text').innerText = `${persona} is typing...`;
    document.getElementById('personaSelection').classList.remove('show');
}

function showPersonaSelection() {
    $('#personaSelection').addClass('show');
}

function showTypingIndicator() {
    $('#typing-container').show();
}

function hideTypingIndicator() {
    $('#typing-container').hide();
}

function initializeWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {
            socket.send(JSON.stringify({ action: 'load_messages' }));
            reconnectInterval = 1000;
        };

        socket.onclose = () => {
            setTimeout(reconnectWebSocket, reconnectInterval);
            reconnectInterval = Math.min(reconnectInterval * 2, MAX_RECONNECT_INTERVAL);
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.action === 'ping') {
                socket.send(JSON.stringify({ action: 'pong' }));
            } else if (msg.action === 'recent_messages') {
                displayRecentMessages(msg.messages);
            } else if (msg.action === 'older_messages') {
                displayMoreMessages(msg.messages);
            } else if (msg.action === 'force_logout') {
                window.location.href = '/login';
            } else if (msg.action === 'select_persona') {
                showPersonaSelection();
            } else if (msg.action === 'redirect_login') {
                alert('Your session is invalid. Please log in again.');
                window.location.href = '/login';
            } else if (msg.type === 'recipe') {
                displayRecipeMessage(msg);
            } else {
                displayBotMessage(msg);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    }
}

function sendMessage() {
    const message = $('#message-input').val();
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message }));
        $('#message-input').val('');
        const userMessageElement = $('<div class="message user">').text(`You: ${message}`);
        $('#messages').append(userMessageElement);
        showTypingIndicator();
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }
}

function displayRecentMessages(messages) {
    messages.reverse().forEach(message => {
        const messageElement = $('<div class="message bot">').text(`${persona}: ${message.Message}`);
        messageElement.attr('data-timestamp', message.Timestamp);
        $('#messages').append(messageElement);
    });
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
}

function displayMoreMessages(messages) {
    messages.forEach(message => {
        const messageElement = $('<div class="message bot">').text(`${persona}: ${message.Message}`);
        messageElement.attr('data-timestamp', message.Timestamp);
        $('#messages').prepend(messageElement);
    });
}

function displayRecipeMessage(msg) {
    const messageElement = $('<div class="message-bubble recipe-message">').html(msg.response);
    const printButton = $('<button class="print-recipe-button" data-recipe-id="' + msg.recipe_id + '">Print Recipe</button>');
    const saveButton = $('<button class="save-recipe-button" data-recipe-id="' + msg.recipe_id + '">Save Recipe</button>');
    messageElement.append(saveButton, printButton);
    $('#messages').append(messageElement);
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
}

function displayBotMessage(msg) {
    const messageElement = $('<div class="message bot">').html(msg.response);
    $('#messages').append(messageElement);
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
}

$(document).ready(() => {
    initializeWebSocket();

    $('#send-button').click(sendMessage);
    $('#message-input').keypress(e => {
        if (e.which == 13) {
            sendMessage();
            return false;
        }
    });

    hideTypingIndicator();

    document.querySelector('.hamburger-menu').addEventListener('click', () => {
        document.querySelector('.options-menu').classList.toggle('show');
    });

    document.getElementById('logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/login';
    });

    document.getElementById('messages').addEventListener('scroll', () => {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });
});

function loadMoreMessages() {
    const lastMessageTimestamp = $('#messages .message:first').data('timestamp');
    if (lastMessageTimestamp) {
        socket.send(JSON.stringify({ action: 'load_more_messages', last_loaded_timestamp: lastMessageTimestamp }));
    }
}
