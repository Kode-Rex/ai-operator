// Import necessary test utilities
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Store original window object
const originalWindow = { ...window };

// Set up test environment
beforeEach(() => {
  // Mock the global window object
  global.window = { ...originalWindow };
  
  // Clear any previous mock calls
  jest.clearAllMocks();
});

// Clean up after tests
afterEach(() => {
  global.window = originalWindow;
});

describe('State Module', () => {
  test('AI_STATE should export expected properties', () => {
    // Import the module under test
    require('../state.js');
    
    // Check that state object is exported correctly
    expect(window.AI_STATE).toBeDefined();
    expect(typeof window.AI_STATE).toBe('object');
    
    // Check individual properties
    expect(window.AI_STATE).toHaveProperty('isPlaying');
    expect(window.AI_STATE).toHaveProperty('isSpeaking');
    expect(window.AI_STATE).toHaveProperty('silenceTimeout');
    expect(window.AI_STATE).toHaveProperty('isAIResponding');
    expect(window.AI_STATE).toHaveProperty('isBeingInterrupted');
    
    // Check initial values
    expect(window.AI_STATE.isPlaying).toBe(false);
    expect(window.AI_STATE.isSpeaking).toBe(false);
    expect(window.AI_STATE.silenceTimeout).toBe(null);
    expect(window.AI_STATE.isAIResponding).toBe(false);
    expect(window.AI_STATE.isBeingInterrupted).toBe(false);
  });
  
  test('AI_STATE properties should be mutable', () => {
    // Import the module under test
    require('../state.js');
    
    // Modify state properties
    window.AI_STATE.isPlaying = true;
    window.AI_STATE.isSpeaking = true;
    window.AI_STATE.silenceTimeout = 12345;
    window.AI_STATE.isAIResponding = true;
    window.AI_STATE.isBeingInterrupted = true;
    
    // Check that properties were updated
    expect(window.AI_STATE.isPlaying).toBe(true);
    expect(window.AI_STATE.isSpeaking).toBe(true);
    expect(window.AI_STATE.silenceTimeout).toBe(12345);
    expect(window.AI_STATE.isAIResponding).toBe(true);
    expect(window.AI_STATE.isBeingInterrupted).toBe(true);
  });
});