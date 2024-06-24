async def process_message_content(raw_message):
    content = raw_message['content'][0]['text']['value']
    print("content:", content)

    annotations = raw_message['content'][0]['text']['annotations']

    # Sort annotations by start_index in descending order to avoid indexing issues during replacement
    annotations.sort(key=lambda x: x['start_index'], reverse=True)

    for annotation in annotations:
        if annotation['type'] == 'file_citation':
            citation_text = annotation['text']
            file_id = annotation['file_citation']['file_id']
            link = f'<a href="/path/to/your/files/{file_id}">{citation_text}</a>'
            start_index = annotation['start_index']
            end_index = annotation['end_index']
            content = content[:start_index] + content[end_index:]
    
    return content
