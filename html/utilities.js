export function printRecipe(button) {
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
