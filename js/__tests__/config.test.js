// Import necessary test utilities
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Store original window object
const originalWindow = { ...window };
let mockRoot;

// Set up test environment
beforeEach(() => {
  // Mock the global window object
  global.window = { ...originalWindow };
  
  // Mock protobuf loader
  mockRoot = {
    lookupType: jest.fn().mockReturnValue({ name: 'MockFrame' })
  };
  
  global.protobuf = {
    load: jest.fn((path, callback) => callback(null, mockRoot))
  };
  
  // Clear any previous mock calls
  jest.clearAllMocks();
});

// Clean up after tests
afterEach(() => {
  global.window = originalWindow;
});

describe('Config Module', () => {
  test('AI_CONFIG should export expected constants', () => {
    // Import the module under test
    require('../config.js');
    
    // Check that constants are exported correctly
    expect(window.AI_CONFIG).toBeDefined();
    expect(window.AI_CONFIG.SAMPLE_RATE).toBe(16000);
    expect(window.AI_CONFIG.NUM_CHANNELS).toBe(1);
    expect(window.AI_CONFIG.PLAY_TIME_RESET_THRESHOLD_MS).toBe(1.0);
    expect(window.AI_CONFIG.SPEECH_THRESHOLD).toBe(0.03);
    expect(window.AI_CONFIG.REQUIRED_CONSECUTIVE_FRAMES).toBe(4);
    expect(window.AI_CONFIG.initProtobuf).toBeInstanceOf(Function);
  });
  
  test('initProtobuf should load the frames.proto file', async () => {
    // Import the module under test
    require('../config.js');
    
    // Call the initProtobuf function
    await window.AI_CONFIG.initProtobuf();
    
    // Check that protobuf.load was called with the correct argument
    expect(protobuf.load).toHaveBeenCalledWith('frames.proto', expect.any(Function));
  });
  
  test('initProtobuf should set Frame on successful load', async () => {
    // Import the module under test
    require('../config.js');
    
    // Call the initProtobuf function
    await window.AI_CONFIG.initProtobuf();
    
    // Check that Frame is set in AI_CONFIG
    expect(window.AI_CONFIG.Frame).toBeDefined();
    expect(window.AI_CONFIG.Frame.name).toBe('MockFrame');
  });
  
  test('initProtobuf should handle load errors', async () => {
    // Import the module under test
    require('../config.js');
    
    // Mock protobuf.load to call callback with an error
    global.protobuf.load = jest.fn((path, callback) => 
      callback(new Error('Failed to load'), null)
    );
    
    // Call initProtobuf and expect it to reject
    await expect(window.AI_CONFIG.initProtobuf()).rejects.toThrow('Failed to load');
  });
  
  test('initProtobuf should handle lookup errors', async () => {
    // Import the module under test
    require('../config.js');
    
    // Mock lookupType to throw an error
    mockRoot.lookupType = jest.fn().mockImplementation(() => {
      throw new Error('Failed to lookup type');
    });
    
    // Call initProtobuf and expect it to reject
    await expect(window.AI_CONFIG.initProtobuf()).rejects.toThrow('Failed to lookup type');
  });
});