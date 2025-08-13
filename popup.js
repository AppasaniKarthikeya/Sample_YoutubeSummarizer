class PopupManager {
  constructor() {
    this.apiKey = null;
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateStatus();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['googleApiKey', 'summarizerSettings']);
      this.apiKey = result.googleApiKey || 'AIzaSyDwTfCcmaFX7L3fUjbyuOTIje3oTSLjMUs';
      this.settings = result.summarizerSettings || {
        autoSummarize: false,
        showTimestamps: true,
        darkMode: true,
        summaryLength: 'medium'
      };

      // Update UI with loaded settings
      this.updateUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showMessage('Failed to load settings', 'error');
    }
  }

  updateUI() {
    // Update API key field
    const apiKeyInput = document.getElementById('apiKey');
    if (this.apiKey && this.apiKey !== 'AIzaSyDwTfCcmaFX7L3fUjbyuOTIje3oTSLjMUs') {
      apiKeyInput.value = this.maskApiKey(this.apiKey);
      apiKeyInput.type = 'password';
    } else {
      apiKeyInput.placeholder = 'Using default API key (optional: enter your own)';
    }

    // Update settings
    document.getElementById('autoSummarize').checked = this.settings.autoSummarize;
    document.getElementById('showTimestamps').checked = this.settings.showTimestamps;
    document.getElementById('darkMode').checked = this.settings.darkMode;
    document.getElementById('summaryLength').value = this.settings.summaryLength;
  }

  setupEventListeners() {
    // API Key Management
    document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());
    document.getElementById('testApiKey').addEventListener('click', () => this.testApiKey());
    document.getElementById('toggleApiKey').addEventListener('click', () => this.toggleApiKeyVisibility());

    // Settings
    document.getElementById('autoSummarize').addEventListener('change', () => this.saveSettings());
    document.getElementById('showTimestamps').addEventListener('change', () => this.saveSettings());
    document.getElementById('darkMode').addEventListener('change', () => this.saveSettings());
    document.getElementById('summaryLength').addEventListener('change', () => this.saveSettings());

    // Actions
    document.getElementById('openYoutube').addEventListener('click', () => this.openYouTube());
    document.getElementById('viewHelp').addEventListener('click', () => this.showHelp());

    // Keyboard shortcuts
    document.getElementById('apiKey').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveApiKey();
    });
  }

  async saveApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const newApiKey = apiKeyInput.value.trim();

    if (!newApiKey) {
      this.showMessage('Please enter a valid API key', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      // Save to storage
      await chrome.storage.sync.set({ googleApiKey: newApiKey });
      this.apiKey = newApiKey;

      // Mask the key in the input
      apiKeyInput.value = this.maskApiKey(newApiKey);
      apiKeyInput.type = 'password';

      this.showMessage('API key saved successfully!', 'success');
      this.updateStatus();
      
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.showMessage('Failed to save API key', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async testApiKey() {
    if (!this.apiKey) {
      this.showMessage('Please save an API key first', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello, please respond with "API connection successful!"'
            }]
          }]
        })
      });

      if (response.ok) {
        this.showMessage('API connection successful!', 'success');
        document.getElementById('apiStatus').textContent = 'Connected';
        document.getElementById('apiStatus').className = 'status-value success';
      } else {
        throw new Error(`API returned ${response.status}`);
      }
      
    } catch (error) {
      console.error('API test failed:', error);
      this.showMessage('API connection failed. Please check your key.', 'error');
      document.getElementById('apiStatus').textContent = 'Failed';
      document.getElementById('apiStatus').className = 'status-value error';
    } finally {
      this.showLoading(false);
    }
  }

  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.getElementById('toggleApiKey');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      if (this.apiKey) {
        apiKeyInput.value = this.apiKey;
      }
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      `;
    } else {
      apiKeyInput.type = 'password';
      if (this.apiKey) {
        apiKeyInput.value = this.maskApiKey(this.apiKey);
      }
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
    }
  }

  async saveSettings() {
    try {
      this.settings = {
        autoSummarize: document.getElementById('autoSummarize').checked,
        showTimestamps: document.getElementById('showTimestamps').checked,
        darkMode: document.getElementById('darkMode').checked,
        summaryLength: document.getElementById('summaryLength').value
      };

      await chrome.storage.sync.set({ summarizerSettings: this.settings });
      this.showMessage('Settings saved!', 'success');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }

  async openYouTube() {
    try {
      await chrome.tabs.create({ url: 'https://www.youtube.com' });
      window.close();
    } catch (error) {
      console.error('Failed to open YouTube:', error);
      this.showMessage('Failed to open YouTube', 'error');
    }
  }

  showHelp() {
    const helpContent = `
      <div style="max-width: 500px; padding: 20px;">
        <h2>YouTube AI Summarizer Help</h2>
        
        <h3>🚀 Getting Started</h3>
        <ol>
          <li>Get a Google AI API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
          <li>Save your API key in the extension popup</li>
          <li>Navigate to any YouTube video</li>
          <li>The summarizer panel will appear on the right side</li>
        </ol>

        <h3>✨ Features</h3>
        <ul>
          <li><strong>AI Summary:</strong> Get concise summaries with key timestamps</li>
          <li><strong>Chat with Video:</strong> Ask questions about the video content</li>
          <li><strong>Smart Recommendations:</strong> Find similar videos based on content</li>
          <li><strong>Doubt Clarification:</strong> Get explanations for complex topics</li>
        </ul>

        <h3>🎯 Tips</h3>
        <ul>
          <li>Click on timestamps to jump to specific video sections</li>
          <li>Use the chat feature to ask specific questions about the content</li>
          <li>Enable auto-summarize for automatic analysis of new videos</li>
          <li>Adjust summary length based on your preferences</li>
        </ul>

        <h3>🔧 Troubleshooting</h3>
        <ul>
          <li><strong>Extension not showing:</strong> Refresh the YouTube page</li>
          <li><strong>API errors:</strong> Check your API key and internet connection</li>
          <li><strong>Slow responses:</strong> Large videos may take longer to analyze</li>
        </ul>

        <h3>📞 Support</h3>
        <p>If you encounter any issues, please check that:</p>
        <ul>
          <li>Your API key is valid and has sufficient quota</li>
          <li>You're on a YouTube video page (not the homepage)</li>
          <li>Your browser allows the extension to run on YouTube</li>
        </ul>
      </div>
    `;

    // Create help modal (simplified version for popup)
    alert('Help & Support:\n\n1. Get Google AI API key from makersuite.google.com\n2. Save API key in extension popup\n3. Navigate to YouTube videos\n4. Use the AI panel that appears on the right\n\nFor detailed help, visit the extension options page.');
  }

  updateStatus() {
    // Update API status
    const apiStatus = document.getElementById('apiStatus');
    if (this.apiKey) {
      apiStatus.textContent = 'Configured';
      apiStatus.className = 'status-value success';
    } else {
      apiStatus.textContent = 'Not configured';
      apiStatus.className = 'status-value error';
    }

    // Update current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentPage = document.getElementById('currentPage');
      if (tabs[0]) {
        const url = tabs[0].url;
        if (url.includes('youtube.com/watch')) {
          currentPage.textContent = 'YouTube Video';
          currentPage.className = 'status-value success';
        } else if (url.includes('youtube.com')) {
          currentPage.textContent = 'YouTube (not video)';
          currentPage.className = 'status-value warning';
        } else {
          currentPage.textContent = 'Other website';
          currentPage.className = 'status-value';
        }
      }
    });
  }

  maskApiKey(key) {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  }

  showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;

    // Insert at top of popup content
    const popupContent = document.querySelector('.popup-content');
    popupContent.insertBefore(messageEl, popupContent.firstChild);

    // Remove message after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 3000);
  }

  showLoading(show) {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      if (show) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    });
  }
}

// Initialize popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});