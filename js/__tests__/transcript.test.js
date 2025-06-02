// Import necessary test utilities
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Store original document/window objects
const originalDocument = { ...document };
const originalWindow = { ...window };

// Mock DOM elements
let mockTranscriptContainer;

// Set up test environment
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock the transcript container
  mockTranscriptContainer = {
    appendChild: jest.fn(),
    scrollTop: 0,
    scrollHeight: 100,
    innerHTML: ''
  };
  
  // Mock document.getElementById
  document.getElementById = jest.fn((id) => {
    if (id === 'transcript-container') return mockTranscriptContainer;
    return null;
  });
  
  // Create storage for mock elements
  const mockElements = [];
  
  // Mock document.createElement
  document.createElement = jest.fn((type) => {
    const element = {
      className: '',
      textContent: '',
      appendChild: jest.fn()
    };
    mockElements.push(element);
    return element;
  });
  
  // Add mockElements to global for access in tests
  global.mockElements = mockElements;
  
  // Reset window
  global.window = { ...originalWindow };
});

// Clean up after tests
afterEach(() => {
  global.document = originalDocument;
  global.window = originalWindow;
});

describe('Transcript Module', () => {
  test('AI_TRANSCRIPT should export expected functions', () => {
    // Import the module under test
    require('../transcript.js');
    
    // Check that transcript object is exported correctly
    expect(window.AI_TRANSCRIPT).toBeDefined();
    expect(typeof window.AI_TRANSCRIPT).toBe('object');
    
    // Check exported functions
    expect(typeof window.AI_TRANSCRIPT.addMessageToTranscript).toBe('function');
    expect(typeof window.AI_TRANSCRIPT.clearTranscript).toBe('function');
  });
  
  test('addMessageToTranscript should create and append message elements', () => {
    // First clean any existing modules
    jest.resetModules();
    
    // Create mocks with spies
    const mockMessageDiv = {
      className: '',
      appendChild: jest.fn()
    };
    
    const mockAvatar = {
      className: '',
      textContent: ''
    };
    
    const mockContent = {
      className: '',
      textContent: ''
    };
    
    // Setup document.createElement to return our mocks
    document.createElement = jest.fn()
      .mockReturnValueOnce(mockMessageDiv)  // First call returns message div
      .mockReturnValueOnce(mockAvatar)      // Second call returns avatar div
      .mockReturnValueOnce(mockContent);    // Third call returns content div
    
    // Create a spy for the container's appendChild
    mockTranscriptContainer.appendChild = jest.fn();
    
    // Import the module
    require('../transcript.js');
    
    // Call the function
    window.AI_TRANSCRIPT.addMessageToTranscript('Hello, world!', 'user');
    
    // Verify createElement was called for all three elements
    expect(document.createElement).toHaveBeenCalledTimes(3);
    
    // Verify the container's appendChild was called with our mockMessageDiv
    expect(mockTranscriptContainer.appendChild).toHaveBeenCalled();
    
    // Verify the message div's appendChild was called twice (for avatar and content)
    expect(mockMessageDiv.appendChild).toHaveBeenCalledTimes(2);
    
    // Verify scrollTop was set to scrollHeight
    expect(mockTranscriptContainer.scrollTop).toBe(mockTranscriptContainer.scrollHeight);
  });
  
  test('addMessageToTranscript should set correct avatar text based on type', () => {
    // Import the module under test
    require('../transcript.js');
    
    // Mock a more sophisticated document.createElement
    let createdElements = [];
    document.createElement = jest.fn((type) => {
      const element = {
        className: '',
        textContent: '',
        appendChild: jest.fn()
      };
      createdElements.push(element);
      return element;
    });
    
    // Call with 'user' type
    window.AI_TRANSCRIPT.addMessageToTranscript('User message', 'user');
    expect(createdElements[1].textContent).toBe('U');
    
    // Reset created elements
    createdElements = [];
    
    // Call with 'ai' type
    window.AI_TRANSCRIPT.addMessageToTranscript('AI message', 'ai');
    expect(createdElements[1].textContent).toBe('AI');
    
    // Reset created elements
    createdElements = [];
    
    // Call with 'system' type
    window.AI_TRANSCRIPT.addMessageToTranscript('System message', 'system');
    expect(createdElements[1].textContent).toBe('S');
  });
  
  test('clearTranscript should empty the container', () => {
    // Reset modules to get a clean slate
    jest.resetModules();
    
    // Create a mock with a proper innerHTML property that we can track
    const mockContainer = {
      innerHTML: 'Some content'
    };
    
    // Set up getElementById to return our mock
    document.getElementById = jest.fn().mockReturnValue(mockContainer);
    
    // Import the module to test
    require('../transcript.js');
    
    // Call clearTranscript
    window.AI_TRANSCRIPT.clearTranscript();
    
    // Check that innerHTML was set to empty string
    expect(mockContainer.innerHTML).toBe('');
  });
  
  test('clearTranscript should handle case when container is not found', () => {
    // Import the module under test
    require('../transcript.js');
    
    // Mock document.getElementById to return null
    document.getElementById = jest.fn().mockReturnValue(null);
    
    // This should run without throwing an error
    expect(() => {
      window.AI_TRANSCRIPT.clearTranscript();
    }).not.toThrow();
  });
});