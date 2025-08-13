// YouTube AI Summarizer Extension - Content Script
// Prevent multiple initializations
if (window.youtubeSummarizerExtension) {
  console.log('YouTube Summarizer Extension already initialized');
} else {
  class YouTubeSummarizerExtension {
    constructor() {
      this.isInitialized = false;
      this.currentVideoId = null;
      this.summarizerPanel = null;
      this.apiKey = 'AIzaSyDwTfCcmaFX7L3fUjbyuOTIje3oTSLjMUs';
      this.isYouTubePage = false;
      this.settings = {
        autoSummarize: false,
        showTimestamps: true,
        darkMode: true,
        summaryLength: 'medium'
      };
      this.init();
    }

    async init() {
      // Check if we're on YouTube
      if (!window.location.hostname.includes('youtube.com')) {
        return;
      }
      
      this.isYouTubePage = true;
      
      // Get API key from storage, fallback to default
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.sync.get(['googleApiKey', 'summarizerSettings']);
          this.apiKey = result.googleApiKey || 'AIzaSyDwTfCcmaFX7L3fUjbyuOTIje3oTSLjMUs';
          this.settings = { ...this.settings, ...result.summarizerSettings };
        }
      } catch (error) {
        console.log('Storage access failed, using default settings');
      }

      // Wait for YouTube to load
      this.waitForYouTubeLoad();
      
      // Listen for navigation changes
      this.observeNavigation();
    }

    waitForYouTubeLoad() {
      if (!this.isYouTubePage) return;
      
      const checkInterval = setInterval(() => {
        const videoPlayer = document.querySelector('#movie_player');
        const rightPanel = document.querySelector('#secondary');
        
        if (videoPlayer && rightPanel && !this.isInitialized) {
          clearInterval(checkInterval);
          setTimeout(() => {
            this.setupSummarizerPanel();
            this.isInitialized = true;
          }, 1000);
        }
      }, 1000);
      
      // Clear interval after 30 seconds to prevent infinite checking
      setTimeout(() => clearInterval(checkInterval), 30000);
    }

    observeNavigation() {
      if (!this.isYouTubePage) return;
      
      let currentUrl = location.href;
      new MutationObserver(() => {
        if (location.href !== currentUrl) {
          currentUrl = location.href;
          if (location.pathname === '/watch') {
            setTimeout(() => this.handleVideoChange(), 1000);
          }
        }
      }).observe(document, { subtree: true, childList: true });
    }

    handleVideoChange() {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v');
      
      if (videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.resetSummarizerPanel();
      }
    }

    setupSummarizerPanel() {
      // Double check we're on the right page
      if (!window.location.pathname.includes('/watch')) {
        return;
      }
      
      const rightPanel = document.querySelector('#secondary');
      if (!rightPanel) return;

      // Remove existing panel if it exists
      const existingPanel = document.getElementById('yt-summarizer-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      // Create main container
      this.summarizerPanel = document.createElement('div');
      this.summarizerPanel.id = 'yt-summarizer-panel';
      this.summarizerPanel.innerHTML = this.getPanelHTML();

      // Insert at the beginning of right panel
      rightPanel.insertBefore(this.summarizerPanel, rightPanel.firstChild);

      // Add event listeners
      this.setupEventListeners();

      // Add animations
      setTimeout(() => {
        this.summarizerPanel.classList.add('yt-summarizer-loaded');
      }, 100);
    }

    getPanelHTML() {
      return `
        <div class="yt-summarizer-container">
          <div class="yt-summarizer-header">
            <div class="yt-summarizer-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
              </svg>
              <h3>AI Summarizer Pro</h3>
            </div>
            <button class="yt-summarizer-toggle" id="summarizer-toggle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <div class="yt-summarizer-content" id="summarizer-content">
            <div class="yt-summarizer-tabs">
              <button class="yt-summarizer-tab active" data-tab="summary">Summary</button>
              <button class="yt-summarizer-tab" data-tab="chat">Chat</button>
              <button class="yt-summarizer-tab" data-tab="recommendations">Similar</button>
            </div>

            <div class="yt-summarizer-tab-content">
              <!-- Summary Tab -->
              <div class="yt-tab-panel active" id="summary-panel">
                <div class="yt-summarizer-actions">
                  <button class="yt-btn yt-btn-primary" id="generate-summary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Generate Summary
                  </button>
                  <button class="yt-btn yt-btn-secondary" id="clear-summary">Clear</button>
                </div>
                
                <div class="yt-summary-loading" id="summary-loading" style="display: none;">
                  <div class="yt-loading-spinner"></div>
                  <p>Analyzing video with AI...</p>
                </div>

                <div class="yt-summary-content" id="summary-result">
                  <div class="yt-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <p>Click "Generate Summary" to analyze this video with AI</p>
                  </div>
                </div>
              </div>

              <!-- Chat Tab -->
              <div class="yt-tab-panel" id="chat-panel">
                <div class="yt-chat-container">
                  <div class="yt-chat-messages" id="chat-messages">
                    <div class="yt-chat-welcome">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <p>Ask me anything about this video!</p>
                    </div>
                  </div>
                  <div class="yt-chat-input-container">
                    <input type="text" id="chat-input" placeholder="Ask about the video content..." maxlength="500">
                    <button id="send-chat" class="yt-chat-send">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Recommendations Tab -->
              <div class="yt-tab-panel" id="recommendations-panel">
                <div class="yt-recommendations-actions">
                  <button class="yt-btn yt-btn-primary" id="find-similar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    Find Similar Videos
                  </button>
                  <button class="yt-btn yt-btn-secondary" id="create-playlist">Create Playlist</button>
                </div>

                <div class="yt-recommendations-loading" id="recommendations-loading" style="display: none;">
                  <div class="yt-loading-spinner"></div>
                  <p>Finding similar content...</p>
                </div>

                <div class="yt-recommendations-content" id="recommendations-result">
                  <div class="yt-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                    <p>Discover similar videos based on content analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    setupEventListeners() {
      // Toggle panel
      const toggle = document.getElementById('summarizer-toggle');
      const content = document.getElementById('summarizer-content');
      
      toggle?.addEventListener('click', () => {
        content.classList.toggle('collapsed');
        toggle.classList.toggle('rotated');
      });

      // Tab switching
      const tabs = document.querySelectorAll('.yt-summarizer-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
      });

      // Summary generation
      document.getElementById('generate-summary')?.addEventListener('click', () => {
        this.generateSummary();
      });

      document.getElementById('clear-summary')?.addEventListener('click', () => {
        this.clearSummary();
      });

      // Chat functionality
      const chatInput = document.getElementById('chat-input');
      const sendChat = document.getElementById('send-chat');

      sendChat?.addEventListener('click', () => this.sendChatMessage());
      chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendChatMessage();
      });

      // Recommendations
      document.getElementById('find-similar')?.addEventListener('click', () => {
        this.findSimilarVideos();
      });

      document.getElementById('create-playlist')?.addEventListener('click', () => {
        this.createPlaylist();
      });
    }

    switchTab(tabName) {
      // Update tab buttons
      document.querySelectorAll('.yt-summarizer-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });

      // Update tab panels
      document.querySelectorAll('.yt-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-panel`);
      });
    }

    async generateSummary() {
      if (!this.apiKey) {
        this.showError('API key not configured. Please check extension settings.');
        return;
      }

      const loadingEl = document.getElementById('summary-loading');
      const resultEl = document.getElementById('summary-result');
      
      loadingEl.style.display = 'block';
      resultEl.innerHTML = '';

      try {
        // Get video details
        const videoTitle = document.querySelector('#title h1')?.textContent || '';
        const videoDescription = document.querySelector('#description-text')?.textContent || '';
        const channelName = document.querySelector('#channel-name a')?.textContent || '';
        
        // Create a comprehensive prompt for better analysis
        const prompt = `
          Analyze this YouTube video and provide a comprehensive summary with the following structure:

          Video Title: "${videoTitle}"
          Channel: "${channelName}"
          Description: "${videoDescription}"

          Please provide your response in this exact JSON format:
          {
            "summary": "A detailed 2-3 paragraph summary of the video content",
            "timestamps": [
              {"time": "0:00", "description": "Introduction and overview"},
              {"time": "2:30", "description": "Main topic discussion"},
              {"time": "5:45", "description": "Key points and examples"}
            ],
            "topics": ["Topic 1", "Topic 2", "Topic 3"],
            "takeaways": [
              "Key insight 1",
              "Key insight 2", 
              "Key insight 3"
            ]
          }

          Make the timestamps realistic and relevant to the content type. Focus on providing valuable insights.
        `;

        const response = await this.callGoogleAI(prompt);
        this.displaySummary(response);
      } catch (error) {
        console.error('Summary generation failed:', error);
        this.showError('Failed to generate summary. Please try again.');
      } finally {
        loadingEl.style.display = 'none';
      }
    }

    async callGoogleAI(prompt) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No response from AI model');
      }
    }

    displaySummary(response) {
      const resultEl = document.getElementById('summary-result');
      
      try {
        // Try to parse as JSON first
        let summary;
        try {
          summary = JSON.parse(response);
        } catch (parseError) {
          // If JSON parsing fails, create a simple structure
          summary = {
            summary: response,
            timestamps: [
              {"time": "0:00", "description": "Video start"},
              {"time": "2:00", "description": "Main content"},
              {"time": "5:00", "description": "Key points"}
            ],
            topics: ["General Content"],
            takeaways: ["See full summary above"]
          };
        }
        
        resultEl.innerHTML = `
          <div class="yt-summary-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Summary
            </h4>
            <p>${summary.summary}</p>
          </div>

          <div class="yt-summary-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Key Timestamps
            </h4>
            <div class="yt-timestamps">
              ${summary.timestamps?.map(timestamp => `
                <div class="yt-timestamp-item" data-time="${timestamp.time}">
                  <span class="yt-timestamp-time">${timestamp.time}</span>
                  <span class="yt-timestamp-desc">${timestamp.description}</span>
                </div>
              `).join('') || '<p>No timestamps available</p>'}
            </div>
          </div>

          <div class="yt-summary-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Main Topics
            </h4>
            <div class="yt-topics">
              ${summary.topics?.map(topic => `<span class="yt-topic-tag">${topic}</span>`).join('') || '<span class="yt-topic-tag">General Content</span>'}
            </div>
          </div>

          <div class="yt-summary-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3 8-8"/>
                <path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.14-1.02L2 22l1.02-5.86C2.37 14.91 2 13.5 2 12c0-4.97 4.03-9 9-9 4.97 0 9 4.03 9 9z"/>
              </svg>
              Key Takeaways
            </h4>
            <ul class="yt-takeaways">
              ${summary.takeaways?.map(takeaway => `<li>${takeaway}</li>`).join('') || '<li>See summary above for key insights</li>'}
            </ul>
          </div>
        `;

        // Add click handlers for timestamps
        document.querySelectorAll('.yt-timestamp-item').forEach(item => {
          item.addEventListener('click', () => {
            const time = item.dataset.time;
            this.seekToTime(time);
          });
        });

      } catch (error) {
        console.error('Error displaying summary:', error);
        resultEl.innerHTML = `
          <div class="yt-summary-section">
            <h4>Summary</h4>
            <p>${response}</p>
          </div>
        `;
      }
    }

    seekToTime(timeString) {
      try {
        const [minutes, seconds] = timeString.split(':').map(Number);
        const totalSeconds = minutes * 60 + (seconds || 0);
        
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = totalSeconds;
          video.play();
        }
      } catch (error) {
        console.error('Error seeking to time:', error);
      }
    }

    async sendChatMessage() {
      const input = document.getElementById('chat-input');
      const message = input.value.trim();
      
      if (!message || !this.apiKey) return;

      // Add user message
      this.addChatMessage(message, 'user');
      input.value = '';

      // Add loading message
      const loadingMsg = this.addChatMessage('Thinking...', 'ai', true);

      try {
        const videoTitle = document.querySelector('#title h1')?.textContent || '';
        const channelName = document.querySelector('#channel-name a')?.textContent || '';
        
        const prompt = `
          You are an AI assistant helping users understand YouTube video content.
          
          Video Context:
          - Title: "${videoTitle}"
          - Channel: "${channelName}"
          
          User Question: "${message}"
          
          Please provide a helpful, accurate response based on what you would expect from a video with this title and context. Keep your response concise but informative.
        `;
        
        const response = await this.callGoogleAI(prompt);

        loadingMsg.remove();
        this.addChatMessage(response, 'ai');
      } catch (error) {
        console.error('Chat error:', error);
        loadingMsg.remove();
        this.addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
      }
    }

    addChatMessage(message, sender, isLoading = false) {
      const messagesContainer = document.getElementById('chat-messages');
      
      // Remove welcome message if it exists
      const welcomeMsg = messagesContainer.querySelector('.yt-chat-welcome');
      if (welcomeMsg) {
        welcomeMsg.remove();
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = `yt-chat-message yt-chat-${sender}`;
      
      if (isLoading) {
        messageEl.classList.add('loading');
      }

      messageEl.innerHTML = `
        <div class="yt-chat-content">
          <p>${message}</p>
        </div>
      `;

      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      return messageEl;
    }

    async findSimilarVideos() {
      if (!this.apiKey) {
        this.showError('API key not configured. Please check extension settings.');
        return;
      }

      const loadingEl = document.getElementById('recommendations-loading');
      const resultEl = document.getElementById('recommendations-result');
      
      loadingEl.style.display = 'block';
      resultEl.innerHTML = '';

      try {
        const videoTitle = document.querySelector('#title h1')?.textContent || '';
        const channelName = document.querySelector('#channel-name a')?.textContent || '';
        const videoDescription = document.querySelector('#description-text')?.textContent || '';
        
        const prompt = `
          Based on this YouTube video, suggest 5 similar videos that would be valuable to watch:
          
          Title: "${videoTitle}"
          Channel: "${channelName}"
          Description: "${videoDescription}"
          
          Please provide suggestions in this JSON format:
          [
            {
              "title": "Suggested video title",
              "description": "Brief description of the video content",
              "reason": "Why this video is similar and valuable"
            }
          ]
          
          Focus on educational value and content relevance.
        `;

        const response = await this.callGoogleAI(prompt);
        this.displayRecommendations(response);
      } catch (error) {
        console.error('Recommendations error:', error);
        this.showError('Failed to find similar videos. Please try again.');
      } finally {
        loadingEl.style.display = 'none';
      }
    }

    displayRecommendations(response) {
      const resultEl = document.getElementById('recommendations-result');
      
      try {
        let recommendations;
        try {
          recommendations = JSON.parse(response);
        } catch (parseError) {
          // If JSON parsing fails, create mock recommendations
          recommendations = [
            {
              title: "Related Content",
              description: "Similar videos based on this content",
              reason: "Content analysis suggests these topics"
            }
          ];
        }
        
        resultEl.innerHTML = `
          <div class="yt-recommendations-list">
            ${recommendations.map((rec, index) => `
              <div class="yt-recommendation-item">
                <div class="yt-rec-header">
                  <span class="yt-rec-number">${index + 1}</span>
                  <h5>${rec.title}</h5>
                </div>
                <p class="yt-rec-desc">${rec.description}</p>
                <p class="yt-rec-reason"><strong>Why recommended:</strong> ${rec.reason}</p>
                <button class="yt-btn yt-btn-small yt-btn-secondary" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(rec.title)}', '_blank')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  Search on YouTube
                </button>
              </div>
            `).join('')}
          </div>
        `;
      } catch (error) {
        console.error('Error displaying recommendations:', error);
        resultEl.innerHTML = `
          <div class="yt-empty-state">
            <p>Unable to display recommendations. Please try again.</p>
          </div>
        `;
      }
    }

    createPlaylist() {
      // Show a more detailed playlist creation dialog
      const playlistDialog = `
        🎵 Playlist Creation Feature
        
        This feature will help you create curated playlists based on AI analysis.
        
        Coming soon:
        • Auto-generate playlists from video topics
        • Smart categorization of saved videos
        • Integration with YouTube's playlist API
        • Export playlists to your YouTube account
        
        For now, you can manually create playlists using the recommendations above!
      `;
      
      alert(playlistDialog);
    }

    clearSummary() {
      document.getElementById('summary-result').innerHTML = `
        <div class="yt-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          <p>Click "Generate Summary" to analyze this video with AI</p>
        </div>
      `;
    }

    resetSummarizerPanel() {
      this.clearSummary();
      
      // Reset chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.innerHTML = `
          <div class="yt-chat-welcome">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>Ask me anything about this video!</p>
          </div>
        `;
      }
      
      // Reset recommendations
      const recommendationsResult = document.getElementById('recommendations-result');
      if (recommendationsResult) {
        recommendationsResult.innerHTML = `
          <div class="yt-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <p>Discover similar videos based on content analysis</p>
          </div>
        `;
      }
    }

    showError(message) {
      // Create a temporary error notification
      const errorEl = document.createElement('div');
      errorEl.className = 'yt-error-notification';
      errorEl.textContent = message;
      
      document.body.appendChild(errorEl);
      
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.remove();
        }
      }, 5000);
    }
  }

  // Initialize the extension only if we're on YouTube and haven't already initialized
  if (window.location.hostname.includes('youtube.com')) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.youtubeSummarizerExtension = new YouTubeSummarizerExtension();
      });
    } else {
      window.youtubeSummarizerExtension = new YouTubeSummarizerExtension();
    }
  }
}