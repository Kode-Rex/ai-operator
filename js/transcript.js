// Get transcript container element
let transcriptContainer = document.getElementById('transcript-container');

// Function to add a message to the transcript
function addMessageToTranscript(text, type = 'user') {
  console.log(`Adding message to transcript - Type: ${type}, Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  
  if (!text || text.trim() === '') {
    console.warn('Attempted to add empty message to transcript, ignoring');
    return;
  }
  
  // Create message container
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  // Create avatar element
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  
  // Set appropriate avatar text based on message type
  if (type === 'system') {
    avatar.textContent = 'S';
    console.log('Created system message avatar');
  } else if (type === 'ai') {
    avatar.textContent = 'AI';
    console.log('Created AI message avatar');
    
    // Add a data attribute to identify AI messages for debugging
    messageDiv.setAttribute('data-ai-message', 'true');
    
    // Add highlight effect for AI messages to make them more visible
    messageDiv.style.animation = 'highlight 1s ease';
  } else {
    avatar.textContent = 'U';
    console.log('Created user message avatar');
  }
  
  // Create content element
  const content = document.createElement('div');
  content.className = 'content';
  
  // Handle potential HTML entities and ensure text is displayed properly
  try {
    // Use textContent to safely set text without rendering HTML
    content.textContent = text;
  } catch (error) {
    console.error('Error setting message content:', error);
    // Fallback to a safe string if there's an error
    content.textContent = 'Error displaying message content';
  }
  
  // Assemble the message
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  // Add to transcript container
  if (transcriptContainer) {
    transcriptContainer.appendChild(messageDiv);
    console.log(`Message added to transcript container. Container now has ${transcriptContainer.childNodes.length} messages`);
    
    // Scroll to bottom
    scrollToBottom();
  } else {
    console.error('Transcript container not found! Message could not be added.');
  }
  
  // Return the created message element (useful for testing and extensions)
  return messageDiv;
}

// Function to scroll the transcript to the bottom
function scrollToBottom() {
  if (transcriptContainer) {
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
      console.log('Scrolled transcript to bottom');
    });
  }
}

// Function to clear transcript
function clearTranscript() {
  console.log('Clearing transcript container');
  if (transcriptContainer) {
    transcriptContainer.innerHTML = '';
    console.log('Transcript cleared successfully');
  } else {
    console.error('Transcript container not found! Cannot clear transcript.');
  }
}

// Add CSS animation for highlighting new AI messages
(function addHighlightAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes highlight {
      0% { background-color: rgba(139, 195, 74, 0.3); }
      100% { background-color: transparent; }
    }
  `;
  document.head.appendChild(style);
  console.log('Added highlight animation for AI messages');
})();

// Function to get all AI messages (useful for debugging)
function getAllAIMessages() {
  if (!transcriptContainer) return [];
  return Array.from(transcriptContainer.querySelectorAll('[data-ai-message="true"]'));
}

// Export transcript functions
window.AI_TRANSCRIPT = {
  addMessageToTranscript,
  clearTranscript,
  scrollToBottom,
  getAllAIMessages
};
