// Variablendeklarationen
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

let conversationHistory = [];
let holdTimer = null;
let isLongPress = false; // Flag für langen Druck

// Klick-Event-Listener für den Senden-Button
sendButton.addEventListener('click', () => {
    console.log('Click-Event ausgelöst');
    console.log('isLongPress:', isLongPress);

    // Wenn es ein langer Druck war, nicht senden
    if (isLongPress) {
        isLongPress = false; // Flag zurücksetzen
        return;
    }

    const message = userInput.value.trim();
    if (message === '') return;

    addMessage('Noah', message, 'user-message');
    conversationHistory.push({ role: 'user', content: message });
    userInput.value = '';
    userInput.style.height = 'auto'; // Höhe zurücksetzen
    sendToAI();
});

// Event Listener für langen Druck
sendButton.addEventListener('mousedown', startHoldTimer);
sendButton.addEventListener('mouseup', clearHoldTimer);
sendButton.addEventListener('mouseleave', clearHoldTimer);
sendButton.addEventListener('touchstart', startHoldTimer);
sendButton.addEventListener('touchend', clearHoldTimer);
sendButton.addEventListener('touchcancel', clearHoldTimer);

// Automatisches Anpassen der Höhe des Textareas
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

// Funktion zum Starten des Timers für langen Druck
function startHoldTimer(event) {
    console.log('startHoldTimer aufgerufen');
    isLongPress = false; // Flag zurücksetzen

    // Füge die aktive Klasse hinzu (optional)
    sendButton.classList.add('hold-active');

    holdTimer = setTimeout(() => {
        isLongPress = true; // Langer Druck erkannt
        console.log('Langer Druck erkannt');
        copyTextToClipboard();
        sendButton.classList.remove('hold-active'); // Entferne die Klasse nach dem Kopieren
    }, 2000); // 2000 Millisekunden = 2 Sekunden
}

// Funktion zum Löschen des Timers
function clearHoldTimer() {
    console.log('clearHoldTimer aufgerufen');
    if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
    }
    sendButton.classList.remove('hold-active');
}

// Funktion zum Kopieren des Textes in die Zwischenablage
function copyTextToClipboard() {
    const textToCopy = `cd ollama
./ollama serve &
./ollama run llama3.2:3b`;

    navigator.clipboard.writeText(textToCopy).catch(err => {
        console.error('Fehler beim Kopieren in die Zwischenablage: ', err);
    });
}

// Funktion zum Hinzufügen von Nachrichten zum Chat
function addMessage(sender, text, className, messageDiv = null) {
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;

        // Nachrichtenblase erstellen
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Nachrichtentext hinzufügen
        const messageText = document.createElement('span');
        messageText.className = 'message-text';

        // Verarbeite den Text für Fettschrift und Zeilenumbrüche
        const processedText = processMessageText(text);

        messageText.innerHTML = processedText;

        bubble.appendChild(messageText);
        messageDiv.appendChild(bubble);
        chatbox.appendChild(messageDiv);
    } else {
        const messageText = messageDiv.querySelector('.message-text');

        // Verarbeite den Text für Fettschrift und Zeilenumbrüche
        const processedText = processMessageText(text);

        messageText.innerHTML = processedText;
    }
    chatbox.scrollTop = chatbox.scrollHeight;
    return messageDiv;
}

// Funktion zum Verarbeiten des Nachrichtentexts (für Fettschrift und Zeilenumbrüche)
function processMessageText(text) {
    // Ersetze **text** durch <strong>text</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Ersetze Zeilenumbrüche durch <br>
    formattedText = formattedText.replace(/\n/g, '<br>');

    return formattedText;
}

// Funktion zum Senden der Nachricht an die KI
async function sendToAI() {
    try {
        // Begrenze den Verlauf auf die letzten 15 Einträge
        const maxHistory = 15;
        const recentHistory = conversationHistory.slice(-maxHistory);

        // Optional: Systemnachricht hinzufügen
        const systemMessage = "Sei ein hilfreicher, professioneller, kreativer und präziser KI-Assistent. Antworte detailliert, aber klar und leicht verständlich. Vermeide unnötig lange Ausführungen oder technische Begriffe, es sei denn, sie sind notwendig und behalte den Gesprächskontext so lange wie möglich bei. Schreibe keine begrüßung. Schreibe fals nötig mit zeilen umbrüchen und **fettem text**";

        const prompt = systemMessage + '\n' + recentHistory.map(entry => {
            return `${entry.role === 'user' ? 'Noah' : 'AI'}: ${entry.content}`;
        }).join('\n') + `\nAI:`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                prompt: prompt
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            addMessage('Fehler', errorText || 'Unbekannter Fehler', 'ai-message');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let aiResponse = '';
        let aiMessageDiv = addMessage('AI', '', 'ai-message'); // Erstelle die Nachricht vorab

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        aiResponse += data.response;
                        // Aktualisiere die KI-Nachricht in Echtzeit
                        addMessage('AI', aiResponse, 'ai-message', aiMessageDiv);
                    }
                } catch (e) {
                    console.error('Fehler beim Parsen von JSON:', e);
                }
            }
        }

        // Füge die KI-Antwort dem Verlauf hinzu
        conversationHistory.push({ role: 'assistant', content: aiResponse });

    } catch (error) {
        addMessage('Fehler', error.message, 'ai-message');
    }
}

// Service Worker Registrierung (falls benötigt)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(registration) {
            console.log('ServiceWorker registriert mit Scope:', registration.scope);
        }, function(err) {
            console.log('ServiceWorker Registrierung fehlgeschlagen:', err);
        });
    });
}