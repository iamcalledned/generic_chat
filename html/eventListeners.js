import { sendMessage, loadMoreMessages, sendPersona } from './websocket.js';
import { printRecipe } from './utilities.js';

export function addEventListeners() {
    document.getElementById('send-button').addEventListener('click', () => {
        const message = document.getElementById('message-input').value;
        sendMessage(message);
    });

    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.which === 13) {
            const message = document.getElementById('message-input').value;
            sendMessage(message);
            return false;
        }
    });

    // Add other event listeners
    // Example: Menu toggle
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const optionsMenu = document.querySelector('.options-menu');

    hamburgerMenu.addEventListener('click', function() {
        optionsMenu.classList.toggle('show');
        hamburgerMenu.classList.toggle('active');
        optionsMenu.classList.add('show-on-click');
    });

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
        }, 300); 
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
        }, 300); 
    });

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

    document.getElementById('messages').addEventListener('scroll', function () {
        if (this.scrollTop === 0) {
            loadMoreMessages();
        }
    });

    document.getElementById('personaDropdown').addEventListener('change', sendPersona);
}
