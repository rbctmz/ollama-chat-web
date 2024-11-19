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

// Initialize theme and chat history
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeChatHistory();
});

// Theme toggle button click handler
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Clear history button click handler
document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите очистить историю чата?')) {
        clearChatHistory();
    }
});

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

// Initialize chat history from localStorage
function initializeChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        try {
            const messages = JSON.parse(savedHistory);
            const chat = document.getElementById('chat');
            chat.innerHTML = ''; // Clear default content
            
            messages.forEach(msg => {
                addMessage(msg.content, msg.isUser);
            });
        } catch (error) {
            console.error('Failed to restore chat history:', error);
            localStorage.removeItem('chatHistory');
        }
    }
}

// Save message to localStorage
function saveMessageToHistory(content, isUser) {
    const savedHistory = localStorage.getItem('chatHistory');
    const messages = savedHistory ? JSON.parse(savedHistory) : [];
    messages.push({ 
        content, 
        isUser, 
        timestamp: new Date().toISOString() 
    });
    localStorage.setItem('chatHistory', JSON.stringify(messages));
}

// Add message to chat
function addMessage(content, isUser, messageId = null) {
    const chat = document.getElementById('chat');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    if (messageId) messageDiv.id = messageId;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isUser) {
        contentDiv.textContent = content;
    } else {
        contentDiv.innerHTML = marked.parse(content);
        // Подсветка кода после рендеринга markdown
        const codeBlocks = contentDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            hljs.highlightElement(block);
        });
    }
    
    messageDiv.appendChild(contentDiv);
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
    
    return messageDiv;
}

// Clear chat history
function clearChatHistory() {
    localStorage.removeItem('chatHistory');
    const chat = document.getElementById('chat');
    chat.innerHTML = '';
}

// Show error message
function showError(message) {
    const chat = document.getElementById('chat');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    chat.appendChild(errorDiv);
    chat.scrollTop = chat.scrollHeight;
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show typing indicator
function showTypingIndicator() {
    const chat = document.getElementById('chat');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.textContent = 'Ollama is thinking';
    
    typingDiv.appendChild(indicator);
    chat.appendChild(typingDiv);
    chat.scrollTop = chat.scrollHeight;
    
    // Disable send button and add loading state
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    sendButton.classList.add('loading');
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
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
    
    if (message.length === 0) return;
    
    messageInput.value = '';
    addMessage(message, true);
    saveMessageToHistory(message, true);
    
    try {
        showTypingIndicator();
        
        const modelSelector = document.getElementById('modelSelector');
        const selectedModel = modelSelector.value;
        
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                model: selectedModel
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from server');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseMessage = '';
        let messageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                
                const data = line.slice(6); // Remove 'data: ' prefix
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.response) {
                        responseMessage += parsed.response;
                        
                        if (!messageDiv) {
                            messageDiv = addMessage(responseMessage, false);
                        } else {
                            const contentDiv = messageDiv.querySelector('.message-content');
                            contentDiv.innerHTML = marked.parse(responseMessage);
                            
                            // Подсветка кода после обновления содержимого
                            const codeBlocks = contentDiv.querySelectorAll('pre code');
                            codeBlocks.forEach(block => {
                                hljs.highlightElement(block);
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse chunk:', e);
                }
            }
        }

        // Save the complete message
        if (responseMessage) {
            saveMessageToHistory(responseMessage, false);
        }

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to get response from Ollama');
    } finally {
        removeTypingIndicator();
    }
}

// Handle Enter key in input
document.getElementById('messageInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});