// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Initialize theme
document.addEventListener('DOMContentLoaded', initializeTheme);

// Theme toggle button click handler
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Function to check if server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        return { isConnected: true, model: data.model };
    } catch (error) {
        console.error('[Client] Server check failed:', error);
        return { isConnected: false };
    }
}

// Function to load available models
async function loadModels() {
    try {
        const response = await fetch('http://localhost:3000/api/models');
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('[Client] Failed to load models:', error);
        return [];
    }
}

// Update model selector
async function updateModelSelector() {
    const selector = document.getElementById('modelSelector');
    const models = await loadModels();
    
    if (models.length > 0) {
        // Get current server status to know default model
        const { model: defaultModel } = await checkServer();
        
        // Clear existing options
        selector.innerHTML = '';
        
        // Add models to selector
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            if (model.name === defaultModel) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    } else {
        selector.innerHTML = '<option value="">No models available</option>';
    }
}

// Update status display
function updateStatus(status) {
    const statusElement = document.getElementById('serverStatus');
    if (statusElement) {
        const { isConnected } = status;
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.style.backgroundColor = isConnected ? '#d4edda' : '#f8d7da';
        statusElement.style.color = isConnected ? '#155724' : '#721c24';
    }
}

// Check server status periodically
setInterval(async () => {
    const status = await checkServer();
    updateStatus(status);
}, 5000);

// Initial server and models check
(async () => {
    const status = await checkServer();
    updateStatus(status);
    await updateModelSelector();
})();

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
    indicator.textContent = 'Ollama is thinking';
    
    typingDiv.appendChild(indicator);
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Disable send button and add loading state
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    sendButton.classList.add('loading');
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
    
    // Enable send button and remove loading state
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = false;
    sendButton.classList.remove('loading');
}

// Handle message sending
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const modelSelector = document.getElementById('modelSelector');
    const selectedModel = modelSelector.value;

    if (!message) return;

    // Clear input and disable it
    messageInput.value = '';
    messageInput.disabled = true;

    // Add user message to chat
    addMessage(message, true);

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                model: selectedModel
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get response');
        }

        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        addMessage(data.response);
        
    } catch (error) {
        console.error('[Client] Error:', error);
        removeTypingIndicator();
        showError(error.message);
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Handle Enter key in input
document.getElementById('messageInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});