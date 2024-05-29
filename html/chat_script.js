const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

document.querySelector('.hamburger-menu').addEventListener('click', function() {
    document.querySelector('.options-menu').classList.toggle('show');
});

document.getElementById('logout').addEventListener('click', function() {
    sessionStorage.clear();
    window.location.href = '/login'; // Adjust the URL as needed
});

function sendPersona() {
    persona = document.getElementById('personaDropdown').value;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'persona_selected',
            persona: persona
        }));
    }
    document.getElementById('typing-text').innerText = persona + ' is typing...';
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

function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        let messageElement;
        if (message.MessageType === 'user') {
            messageElement = $('<div class="message user">').text('You: ' + message.Message);
        } else if (message.MessageType === 'bot') {
            messageElement = $('<div class="message bot">').text(persona + ': ' + message.Message);
        } else {
            messageElement = $('<div class="message">').text(message.Message);
        }
        messageElement.attr('data-timestamp', message.Timestamp);
        $('#messages').append(messageElement);
    });
    $('#messages').scrollTop($('#messages')[0].scrollHeight);
}

function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let messageElement;
        if (message.MessageType === 'user') {
            messageElement = $('<div class="message user">').text('You: ' + message.Message);
        } else if (message.MessageType === 'bot') {
            messageElement = $('<div class="message bot">').text(persona + ': ' + message.Message);
        } else {
            messageElement = $('<div class="message">').text(message.Message);
        }
        messageElement.attr('data-timestamp', message.Timestamp);
        $('#messages').prepend(messageElement);
    });
}

function getOldestMessageTimestamp() {
    const oldestMessage = $('#messages .message:first');
    return oldestMessage.data('timestamp');
}

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
            if (msg.action === 'ping') {
                socket.send(JSON.stringify({ action: 'pong' }));
            } else if (msg.action === 'recent_messages') {
                displayRecentMessages(msg.messages);
            } else if (msg.action === 'older_messages') {
                displayMoreMessages(msg.messages);
            } else if (msg.action === 'force_logout' || msg.action === 'redirect_login') {
                window.location.href = '/login';
            } else if (msg.action === 'select_persona') {
                showPersonaSelection();
            } else {
                hideTypingIndicator();
                let messageElement;
                if (msg.type === 'recipe') {
                    messageElement = $('<div class="message-bubble recipe-message">').html(msg.response);
                    const printButton = $('<button class="print-recipe-button" data-recipe-id="' + msg.recipe_id + '">Print Recipe</button>');
                    const saveButton = $('<button class="save-recipe-button" data-recipe-id="' + msg.recipe_id + '">Save Recipe</button>');
                    messageElement.append(saveButton, printButton);
                } else {
                    messageElement = $('<div class="message bot">').html(msg.response);
                }
                $('#messages').append(messageElement);
                $('#messages').scrollTop($('#messages')[0].scrollHeight);
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket Error:', error);
        };
    }
}

function sendMessage() {
    const message = $('#message-input').val();
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message }));
        $('#message-input').val('');
        $('#messages').append($('<div class="message user">').text('You: ' + message));
        showTypingIndicator();
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    } else {
        console.error('WebSocket is not open. ReadyState:', socket.readyState);
    }
}

$(document).ready(function() {
    initializeWebSocket();
    $('#send-button').click(sendMessage);
    $('#message-input').keypress(function(e) {
        if (e.which == 13) {
            sendMessage();
            return false;
        }
    });
    hideTypingIndicator();

    $(document).on('click', '.save-recipe-button', function() {
        const recipeId = $(this).data('recipe-id');
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'save_recipe', content: recipeId }));
        } else {
            console.error('WebSocket is not open.');
        }
    });

    $(document).on('click', '.print-recipe-button', function() {
        const recipeId = $(this).data('recipe-id');
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'print_recipe', content: recipeId }));
        } else {
            console.error('WebSocket is not open.');
        }
    });

    $('#messages').scroll(function() {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });
});

function reconnectWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        initializeWebSocket();
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
