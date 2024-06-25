import json

def format_response_table(response_json, content_type):
    if isinstance(response_json, str):
        try:
            response_json = json.loads(response_json)
        except json.JSONDecodeError:
            return f"<p>{response_json}</p>"  # If it fails to parse, return it as plain text.

    if content_type == 'recipe':
        response_text = f"<div class='recipe-container'><h2>A recipe for: {response_json['title']}</h2>"
        response_text += f"<p><strong>Prep time:</strong> {response_json['prep_time']}</p>"
        response_text += f"<p><strong>Cook time:</strong> {response_json['cook_time']}</p>"
        response_text += f"<p><strong>Total time:</strong> {response_json['total_time']}</p>"
        response_text += f"<p><strong>Servings:</strong> {response_json['servings']}</p>"
        response_text += "<h3>Ingredients:</h3><ul>"
        response_text += "".join(f"<li>{ingredient}</li>" for ingredient in response_json['ingredients'])
        response_text += "</ul>"
        response_text += "<h3>Instructions:</h3><ol>"
        response_text += "".join(f"<li>{instruction}</li>" for instruction in response_json['instructions'])
        response_text += "</ol>"
        response_text += "<button class='print-recipe-button' onclick='printRecipe(this)'>Print Recipe</button></div>"
    elif content_type == 'shopping_list':
        response_text = "<h2>Shopping List:</h2>"
        for department, items in response_json['departments'].items():
            response_text += f"<h3>{department}:</h3><ul>"
            response_text += "".join(f"<li>{item}</li>" for item in items)
            response_text += "</ul>"
    else:
        response_text = f"<p>{response_json.get('message', '')}</p>"
    return response_text
