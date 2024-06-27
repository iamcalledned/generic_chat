export function printRecipe(buttonElement) {
    const recipeContainer = buttonElement.closest('.recipe-container');
    if (recipeContainer) {
        const printContents = recipeContainer.innerHTML;

        const printStyles = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap');
                @media print {
                    body {
                        font-family: 'Homemade Apple', cursive;
                        background: white;
                    }
                    .recipe-card {
                        width: 100%;
                        max-width: 900px;
                        margin: auto;
                        padding: 20px;
                        border: 1px solid #ccc;
                        border-radius: 10px;
                        background: white;
                        box-shadow: none;
                    }
                    .recipe-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .recipe-title {
                        font-size: 2em;
                        text-align: left;
                    }
                    .recipe-icons {
                        display: flex;
                        gap: 10px;
                    }
                    .recipe-icons img {
                        height: 40px;
                    }
                    .recipe-ingredients,
                    .recipe-instructions {
                        width: 45%;
                    }
                    .recipe-content {
                        display: flex;
                        justify-content: space-between;
                    }
                    .recipe-footer {
                        text-align: right;
                        margin-top: 20px;
                    }
                }
            </style>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Recipe</title>
                    ${printStyles}
                </head>
                <body>
                    <div class="recipe-card">
                        <div class="recipe-header">
                            <div class="recipe-title">Recipe</div>
                            <div class="recipe-icons">
                                <img src="https://path.to/teapot-icon.png" alt="Teapot">
                                <img src="https://path.to/utensils-icon.png" alt="Utensils">
                                <!-- Add more icons as needed -->
                            </div>
                        </div>
                        <div class="recipe-content">
                            <div class="recipe-ingredients">
                                <h3>Ingredients</h3>
                                ${recipeContainer.querySelector('.ingredients').innerHTML}
                            </div>
                            <div class="recipe-instructions">
                                <h3>Directions</h3>
                                ${recipeContainer.querySelector('.instructions').innerHTML}
                            </div>
                        </div>
                        <div class="recipe-footer">from the kitchen of ${message.from}</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
}

export function showTypingIndicator() {
    document.getElementById('typing-container').style.display = 'flex';
}

export function hideTypingIndicator() {
    document.getElementById('typing-container').style.display = 'none';
}

export function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear all messages
}

export function displayRecentMessages(messages) {
    messages.reverse().forEach(function(message) {
        let formattedContent = formatMessageContent(message.Message);
        let messageElement;
        
        if (message.MessageType === 'user') {
            formattedContent = `You: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'user');
        } else if (message.MessageType === 'bot') {
            formattedContent = `Ned: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'bot');
        } else {
            messageElement = createMessageElement(formattedContent, '');
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').appendChild(messageElement);
    });

    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

export function displayMoreMessages(messages) {
    messages.forEach(function(message) {
        let formattedContent = formatMessageContent(message.Message);
        let messageElement;
        
        if (message.MessageType === 'user') {
            formattedContent = `You: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'user');
        } else if (message.MessageType === 'bot') {
            formattedContent = `Ned: ${formattedContent}`;
            messageElement = createMessageElement(formattedContent, 'bot');
        } else {
            messageElement = createMessageElement(formattedContent, '');
        }

        messageElement.setAttribute('data-timestamp', message.Timestamp);
        document.getElementById('messages').prepend(messageElement);
    });
}

export function getOldestMessageTimestamp() {
    const oldestMessage = document.querySelector('#messages .message:first-child');
    return oldestMessage ? oldestMessage.getAttribute('data-timestamp') : null;
}

export function showOverlay(threads) {
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

export function formatMessageContent(message) {
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
