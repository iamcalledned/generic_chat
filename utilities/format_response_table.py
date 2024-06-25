import json

def format_response_table(message_content, content_type):
    if isinstance(message_content, str):
        message_content = json.loads(message_content)

    if content_type == 'recipe':
        response_text = f"<div class='recipe-container'><h2>A recipe for: {message_content['title']}</h2>"
        response_text += f"<p><strong>Prep time:</strong> {message_content['prep_time']}</p>"
        response_text += f"<p><strong>Cook time:</strong> {message_content['cook_time']}</p>"
        response_text += f"<p><strong>Total time:</strong> {message_content['total_time']}</p>"
        response_text += f"<p><strong>Servings:</strong> {message_content['servings']}</p>"
        response_text += "<h3>Ingredients:</h3><ul>"
        response_text += "".join(f"<li>{ingredient}</li>" for ingredient in message_content['ingredients'])
        response_text += "</ul>"
        response_text += "<h3>Instructions:</h3><ol>"
        response_text += "".join(f"<li>{instruction}</li>" for instruction in message_content['instructions'])
        response_text += "</ol>"
        response_text += "<button class='print-recipe-button' onclick='printRecipe(this)'>Print Recipe</button></div>"
    elif content_type == 'shopping_list':
        response_text = "<h2>Shopping List:</h2>"
        for department, items in message_content['departments'].items():
            response_text += f"<h3>{department}:</h3><ul>"
            response_text += "".join(f"<li>{item}</li>" for item in items)
            response_text += "</ul>"
    else:
        response_text = f"<p>{message_content.get('message', '')}</p>"
    return response_text
