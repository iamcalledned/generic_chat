const WEBSOCKET_URL = 'wss://www.iamcalledned.ai/ws';
let socket;
let reconnectInterval = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
let persona = "";

const hamburgerMenu = document.querySelector('.hamburger-menu');
const optionsMenu = document.querySelector('.options-menu');

// Click event for mobile
hamburgerMenu.addEventListener('click', function() {
    optionsMenu.classList.toggle('show');
    hamburgerMenu.classList.toggle('active');
    optionsMenu.classList.add('show-on-click');
});

// Hover events for desktop
hamburgerMenu.addEventListener('mouseenter', function() {
    optionsMenu.classList.add('show');
    hamburgerMenu.classList.add('active');
});

hamburgerMenu.addEventListener('mouseleave', function() {
    setTimeout(function() {
        if (!optionsMenu.matches(':hover')) {
            optionsMenu.classList.remove('show');
            hamburgerMenu.classList.remove('active');
        }
    }, 300); // Small delay to allow moving the mouse to the options menu
});

optionsMenu.addEventListener('mouseenter', function() {
    optionsMenu.classList.add('show');
    hamburgerMenu.classList.add('active');
});

optionsMenu.addEventListener('mouseleave', function() {
    setTimeout(function() {
        if (!hamburgerMenu.matches(':hover')) {
            optionsMenu.classList.remove('show');
            hamburgerMenu.classList.remove('active');
        }
    }, 300); // Small delay to ensure smooth hover transition
});

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    if (!hamburgerMenu.contains(event.target) && !optionsMenu.contains(event.target)) {
        optionsMenu.classList.remove('show');
        hamburgerMenu.classList.remove('active');
        optionsMenu.classList.remove('show-on-click');
    } else if (hamburgerMenu.contains(event.target)) {
        optionsMenu.classList.toggle('show-on-click');
    }
});

document.getElementById('logout').addEventListener('click', function() {
    sessionStorage.clear();
    window.location.href = '/login';
});

document.getElementById('switch_persona').addEventListener('click', function() {
    document.getElementById('personaSelection').classList.add('show');
    
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
        socket.send(JSON.stringify({ action: 'clear_conversations', persona: persona }));
    }
});

function printRecipe(button) {
    const recipeContainer = button.parentNode.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Recipe</title>
            <style>
                body {
                    font-family: 'Roboto', sans-serif;
                    margin: 20px;
                }
                h2, h3 {
                    margin: 10px 0;
                }
                p {
                    margin: 10px 0;
                }
                ul, ol {
                    padding-left: 20px;
                    margin: 10px 0;
                }
                ul li, ol li {
                    margin: 5px 0;
                }
                ul {
                    list-style-type: disc;
                }
                ol {
                    list-style-type: decimal;
                }
                .ingredients, .instructions {
                    background: #f9f9f9;
                    padding: 10px;
                    border-radius: 10px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body onload="window.print();window.close()">
            ${recipeContainer}
        </body>
        </html>
    `);
    printWindow.document.close();
}

function sendPersona() {
    persona = document.getElementById('personaDropdown').value;
    clearMessages(); // Clear old messages when switching persona
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: 'persona_selected',
            persona: persona
        }));
    }
    document.getElementById('typing-text').innerText = persona + ' is typing...';
    document.getElementById('personaSelection').classList.remove('show');
    clearMessages(); // Clear old messages when switching persona
}

function showTypingIndicator() {
    document.getElementById('typing-container').style.display = 'flex';
}

function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear all messages
}

function formatMessageContent(message) {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        } catch (e) {
            return `<p>${message}</p>`;
        }
    }
    if (message.type === 'recipe') {
        let responseText = `<div class='recipe-container'><h2>A recipe for: ${message.title}</h2>`;
        responseText += `<p><strong>Prep time:</strong> ${message.prep_time}</p>`;
        responseText += `<p><strong>Cook time:</strong> ${message.cook_time}</p>`;
        responseText += `<p><strong>Total time:</strong> ${message.total_time}</p>`;
        responseText += `<p><strong>Servings:</strong> ${message.servings}</p>`;
        responseText += "<h3>Ingredients:</h3><ul>";
        responseText += message.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('');
        responseText += "</ul>";
        responseText += "<h3>Instructions:</h3><ol>";
        responseText += message.instructions.map(instruction => `<li>${instruction}</li>`).join('');
        responseText += "</ol>";
        responseText += "<button class='print-recipe-button' onclick='printRecipe(this)'>Print Recipe</button></div>";
        return responseText;
    } else if (message.type === 'shopping_list') {
        let responseText = "<h2>Shopping List:</h2>";
        for (const [department, items] of Object.entries(message.departments)) {
            responseText += `<h3>${department}</h3><ul>`;
            responseText += items.map(item => `<li>${item}</li>`).join('');
            responseText += "</ul>";
        }
        return responseText;
    } else {
        return `<p>${message.message}</p>`;
    }
}

function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        let messageElement = document.createElement('div');
        let formattedContent = formatMessageContent(message.Message);

        if (message.MessageType === 'user') {
            messageElement.className = 'message user';
            messageElement.innerHTML = `<p>You: ${formattedContent}</p>`;
        } else if (message.MessageType === 'bot') {
            messageElement.className = 'message bot';
            messageElement.innerHTML = `<p>Ned: ${formattedContent}</p>`;
        } else {
            messageElement.className = 'message';
            messageElement.innerHTML = formattedContent;
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').appendChild(messageElement);
    });

    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let messageElement = document.createElement('div');
        let formattedContent = formatMessageContent(message.Message);

        if (message.MessageType === 'user') {
            messageElement.className = 'message user';
            messageElement.innerHTML = `<p>You: ${formattedContent}</p>`;
        } else if (message.MessageType === 'bot') {
            messageElement.className = 'message bot';
            messageElement.innerHTML = `<p>Ned: ${formattedContent}</p>`;
        } else {
            messageElement.className = 'message';
            messageElement.innerHTML = formattedContent;
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').prepend(messageElement);
    });
}

function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.getAttribute('data-timestamp') : null;
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
            console.log("Received message:", msg); // Log the received message for debugging
            if (msg.action === 'ping') {
                socket.send(JSON.stringify({ action: 'pong' }));
            } else if (msg.action === 'recent_messages') {
                displayRecentMessages(msg.messages);
            } else if (msg.action === 'older_messages') {
                displayMoreMessages(msg.messages);
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
                messageElement.innerHTML = formatMessageContent(msg.response); // Use formatMessageContent to render HTML content
                document.getElementById('messages').appendChild(messageElement);
                document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket Error:', error);
        };
    }
}

function showOverlay(threads) {
    const threadsList = document.getElementById('threadsList');
    threadsList.innerHTML = ''; // Clear any existing content

    threads.forEach(thread => {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = thread.threadID;

        const label = document.createElement('label');
        label.textContent = `Thread ID: ${thread.threadID}, Created Time: ${thread.createdTime}`;

        threadItem.appendChild(checkbox);
        threadItem.appendChild(label);
        threadsList.appendChild(threadItem);
    });

    document.getElementById('overlay').style.display = 'block';
}

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
            last_loaded_timestamp: lastMessageTimestamp,
            persona: persona
        }));
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initializeWebSocket();
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.which === 13) {
            sendMessage();
            return false;
        }
    });
    hideTypingIndicator();

    document.addEventListener('click', function (event) {
        if (!hamburgerMenu.contains(event.target) && !optionsMenu.contains(event.target)) {
            optionsMenu.classList.remove('show');
            hamburgerMenu.classList.remove('active');
            optionsMenu.classList.remove('show-on-click');
        }
    });

    document.getElementById('messages').addEventListener('scroll', function () {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });
});

function sendMessage() {
    const message = document.getElementById('message-input').value;
    if (message.trim().length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'chat_message', message: message, persona: persona }));
        document.getElementById('message-input').value = '';
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.textContent = 'You: ' + message;
        document.getElementById('messages').appendChild(messageElement);
        showTypingIndicator();
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    } else {
        console.error('WebSocket is not open. ReadyState:', socket.readyState);
    }
}
