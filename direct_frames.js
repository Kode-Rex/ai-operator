// Direct frame injection for debugging
window.addEventListener('load', function() {
  console.log('Direct frame injection script loaded');
  
  // Wait for initialization
  setTimeout(() => {
    // Add a debug button to inject test frames
    const injectBtn = document.createElement('button');
    injectBtn.textContent = 'Inject AI Transcript';
    injectBtn.style.position = 'fixed';
    injectBtn.style.top = '10px';
    injectBtn.style.right = '10px';
    injectBtn.style.zIndex = '1000';
    document.body.appendChild(injectBtn);
    
    injectBtn.addEventListener('click', () => {
      console.log('Injecting AI transcript message');
      if (window.AI_TRANSCRIPT) {
        // Directly add AI message to transcript
        window.AI_TRANSCRIPT.addMessageToTranscript('This is a direct AI test message', 'ai');
        console.log('AI test message injected');
      } else {
        console.error('AI_TRANSCRIPT not available');
      }
    });
    
    // Create a test message function for console use
    window.testAIMessage = function(message) {
      if (window.AI_TRANSCRIPT) {
        window.AI_TRANSCRIPT.addMessageToTranscript(message || 'Test AI message from console', 'ai');
        return true;
      }
      return false;
    };
    
    // Add a user message test function as well
    window.testUserMessage = function(message) {
      if (window.AI_TRANSCRIPT) {
        window.AI_TRANSCRIPT.addMessageToTranscript(message || 'Test user message from console', 'user');
        return true;
      }
      return false;
    };
    
    // Add a system message test function
    window.testSystemMessage = function(message) {
      if (window.AI_TRANSCRIPT) {
        window.AI_TRANSCRIPT.addMessageToTranscript(message || 'Test system message from console', 'system');
        return true;
      }
      return false;
    };
    
    // Add a function to clear the transcript
    window.clearTranscript = function() {
      if (window.AI_TRANSCRIPT && window.AI_TRANSCRIPT.clearTranscript) {
        window.AI_TRANSCRIPT.clearTranscript();
        console.log('Transcript cleared');
        return true;
      }
      console.error('clearTranscript function not available');
      return false;
    };
    
    console.log('Direct frame injection script initialized');
    console.log('Available test functions:');
    console.log('- window.testAIMessage("Your message")');
    console.log('- window.testUserMessage("Your message")');
    console.log('- window.testSystemMessage("Your message")');
    console.log('- window.clearTranscript()');
  }, 2000);
});
