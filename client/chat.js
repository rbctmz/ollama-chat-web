// Function to check if server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'OPTIONS'
        });
        return response.ok;
    } catch (error) {
        console.error('[Client] Server check failed:', error);
        return false;
    }
}

// Update status display
function updateStatus(isConnected) {
    const statusElement = document.getElementById('serverStatus');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.style.backgroundColor = isConnected ? '#d4edda' : '#f8d7da';
        statusElement.style.color = isConnected ? '#155724' : '#721c24';
    }
}

// Check server status periodically
setInterval(async () => {
    const isConnected = await checkServer();
    updateStatus(isConnected);
}, 5000);

// Initial server check
checkServer().then(updateStatus);

// Configure marked.js with custom renderer
const renderer = new marked.Renderer();

// Custom renderer for code blocks
renderer.code = function(code, language) {
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
    
    return `<div class="code-block">
              <div class="code-header">
                <span class="code-language">${validLanguage}</span>
                <i class="fas fa-copy copy-icon" onclick="copyCode(this)" title="Copy code"></i>
              </div>
              <pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>
            </div>`;
};

marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

// Function to copy code to clipboard
function copyCode(icon) {
    const codeBlock = icon.closest('.code-block').querySelector('code');
    const code = codeBlock.innerText;
    
    navigator.clipboard.writeText(code).then(() => {
        // Update icon
        icon.classList.remove('fa-copy');
        icon.classList.add('fa-check', 'copied');
        
        // Show toast notification
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        
        // Reset icon and hide toast after 2 seconds
        setTimeout(() => {
            icon.classList.remove('fa-check', 'copied');
            icon.classList.add('fa-copy');
            toast.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        // Show error icon
        icon.classList.remove('fa-copy');
        icon.classList.add('fa-times');
        setTimeout(() => {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-copy');
        }, 2000);
    });
}

// Add message to chat history
function addMessage(content, isUser = false) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Parse markdown and render HTML for assistant messages
    if (!isUser) {
        messageContent.innerHTML = marked.parse(content);
        // Add click handlers for copy icons
        messageContent.querySelectorAll('.copy-icon').forEach(icon => {
            icon.onclick = () => copyCode(icon);
        });
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(messageContent);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Show error message
function showError(message) {
    const chatHistory = document.getElementById('chatHistory');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    chatHistory.appendChild(errorDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show typing indicator
function showTypingIndicator() {
    const chatHistory = document.getElementById('chatHistory');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.textContent = 'Thinking...';
    
    typingDiv.appendChild(indicator);
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Handle message sending
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const message = input.value.trim();

    if (!message) return;

    // Disable input and button
    input.disabled = true;
    sendButton.disabled = true;

    // Add user message to chat
    addMessage(message, true);
    input.value = '';

    // Check server before sending
    const isServerRunning = await checkServer();
    if (!isServerRunning) {
        showError('Server is not running. Please start the server and try again.');
        input.disabled = false;
        sendButton.disabled = false;
        return;
    }

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get response');
        }

        const data = await response.json();
        removeTypingIndicator();
        addMessage(data.response);
    } catch (error) {
        removeTypingIndicator();
        showError(error.message);
        console.error('[Client] Error:', error);
    }

    // Re-enable input and button
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
}

// Handle Enter key in input
document.getElementById('messageInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});