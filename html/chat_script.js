const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';

let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
var persona = "";

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

function initializeWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = function() {
            var messageObject = { action: 'load_messages' };
            socket.send(JSON.stringify(messageObject));
            reconnectInterval = 1000;
        };

        socket.onclose = function(event) {
            setTimeout(reconnectWebSocket, reconnectInterval);
            reconnectInterval = Math.min(reconnectInterval * 2, MAX_RECONNECT_INTERVAL);
        };

        socket.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            if (msg.action === 'ping') {
                var pongMessage = { action: 'pong' };
                socket.send(JSON.stringify(pongMessage));
            } else if (msg.action === 'shopping_list_update') {
                updateShoppingListUI(msg.shoppingList);
            } else if (msg.action === 'recent_messages') {
                displayRecentMessages(msg.messages);
            } else if (msg.action === 'older_messages') {
                displayMoreMessages(msg.messages);
            } else if (msg.action === 'user_recipes_list') {
                displayUserRecipes(msg.recipes);
            } else if (msg.action === 'force_logout') {
                window.location.href = '/login';
            } else if (msg.action === 'select_persona') {
                showPersonaSelection();
            } else if (msg.action === 'redirect_login') {
                alert('Your session is invalid. Please log in again.');
                window.location.href = '/login';
            } else if (msg.action === 'recipe_saved') {
                if (msg.status === 'success') {
                    $('.save-recipe-button').text('Recipe Saved').addClass('recipe-saved-button').prop('disabled', true);
                    showNotificationBubble('Recipe saved');
                } else {
                    showNotificationBubble('Failed to save recipe');
                }
            } else if (msg.action === 'recipe_printed') {
                var recipeHtml = msg.data;
                var printWindow = window.open('', '_blank');
                printWindow.document.write('<html><head><title>Print Recipe</title></head><body>');
                printWindow.document.write(recipeHtml);
                printWindow.document.write('</body></html>');
                printWindow.onload = function() {
                    printWindow.print();
                    printWindow.close();
                };
            } else {
                hideTypingIndicator();
                var messageElement;
                if (msg.type === 'recipe') {
                    messageElement = $('<div class="message-bubble recipe-message">');
                    var messageContent = $('<div class="message-content">').html(msg.response);
                    var printButton = $('<button class="print-recipe-button" data-recipe-id="' + msg.recipe_id + '">Print Recipe</button>');
                    var saveButton = $('<button class="save-recipe-button" data-recipe-id="' + msg.recipe_id + '">Save Recipe</button>');
                    messageElement.append(messageContent, saveButton, printButton);
                } else if (msg.type === 'shopping_list') {
                    messageElement = $('<div class="message-bubble shopping-list-message">');
                    var messageContent = $('<div class="message-content">').html(msg.response);
                    var saveButton = $('<button class="save-shopping-list-button">Save Shopping List</button>');
                    messageElement.append(messageContent, saveButton);
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
    var message = $('#message-input').val();
    if (message.trim().length > 0) {
        if (socket.readyState === WebSocket.OPEN) {
            var messageObject = { action: 'chat_message', message: message };
            socket.send(JSON.stringify(messageObject));
            $('#message-input').val('');
            var userMessageElement = $('<div class="message user">').text('You: ' + message);
            $('#messages').append(userMessageElement);
            showTypingIndicator();
            $('#messages').scrollTop($('#messages')[0].scrollHeight);
        } else {
            console.error('WebSocket is not open. ReadyState:', socket.readyState);
        }
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

    $(document).on('mouseenter', '.save-recipe-button', function() {
        if ($(this).prop('disabled')) {
            $(this).append($('<span class="tooltip">Already saved!</span>'));
        } else {
            $(this).append($('<span class="tooltip">Click to add this to your recipe box!</span>'));
        }
    }).on('mouseleave', '.save-recipe-button', function() {
        $(this).find('.tooltip').remove();
    });

    $(document).on('click', '.save-recipe-button', function() {
        var recipeId = $(this).data('recipe-id');
        if (socket && socket.readyState === WebSocket.OPEN) {
            var saveCommand = { action: 'save_recipe', content: recipeId };
            socket.send(JSON.stringify(saveCommand));
        } else {
            console.error('WebSocket is not open.');
        }
    });

    $(document).on('click', '.print-recipe-button', function() {
        var recipeId = $(this).data('recipe-id');
        if (socket && socket.readyState === WebSocket.OPEN) {
            var PrintCommand = { action: 'print_recipe', content: recipeId };
            socket.send(JSON.stringify(PrintCommand));
        } else {
            console.error('WebSocket is not open.');
        }
    });

    window.addEventListener('load', () => {
        function updateOnlineStatus() {
            if (navigator.onLine) {
                reconnectWebSocket();
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    document.querySelector('.hamburger-menu').addEventListener('click', function() {
        document.querySelector('.options-menu').classList.toggle('show');
    });

    document.getElementById('logout').addEventListener('click', function() {
        sessionStorage.clear();
        window.location.href = '/login';
    });

    document.getElementById('messages').addEventListener('scroll', function() {
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

function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            initializeWebSocket();
        }
    }
}

function showNotificationBubble(message) {
    var bubble = $('<div class="notification-bubble">' + message + '</div>');
    $('body').append(bubble);
    bubble.fadeIn(200).delay(3000).fadeOut(200, function() {
        $(this).remove();
    });
}
