// Background script for YouTube AI Summarizer Extension

// Install event
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube AI Summarizer Extension installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getVideoTranscript':
      handleGetVideoTranscript(request.videoId, sendResponse);
      return true; // Will respond asynchronously
      
    case 'callGoogleAI':
      handleGoogleAICall(request, sendResponse);
      return true; // Will respond asynchronously
      
    case 'saveSettings':
      handleSaveSettings(request.settings, sendResponse);
      return true;
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

async function handleGetVideoTranscript(videoId, sendResponse) {
  try {
    // In a real implementation, this would extract transcript from YouTube
    // For now, we'll return a placeholder response
    sendResponse({ 
      success: true, 
      transcript: 'Video transcript would be extracted here...' 
    });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

async function handleGoogleAICall(request, sendResponse) {
  try {
    const { prompt, apiKey = 'AIzaSyDwTfCcmaFX7L3fUjbyuOTIje3oTSLjMUs' } = request;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
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
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      sendResponse({
        success: true,
        result: data.candidates[0].content.parts[0].text
      });
    } else {
      throw new Error('No response from AI model');
    }
    
  } catch (error) {
    console.error('Google AI API Error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set({ summarizerSettings: settings });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.sync.get('summarizerSettings');
    sendResponse({ 
      success: true, 
      settings: result.summarizerSettings || {} 
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle tab updates to inject content script on YouTube watch pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // Ensure content script is injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => console.log('Script already injected or failed:', err));
  }
});