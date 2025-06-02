// Import necessary test utilities
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Store original document/window objects
const originalDocument = { ...document };
const originalWindow = { ...window };
const originalNavigator = { ...navigator };

// Set up test environment
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    binaryType: null
  }));
  
  // Mock navigator.mediaDevices
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      // Mock stream
      getTracks: () => [{stop: jest.fn()}]
    })
  };
  
  // Mock AI_CONFIG
  global.AI_CONFIG = {
    Frame: {
      decode: jest.fn(),
      encode: jest.fn().mockReturnValue({
        finish: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
      }),
      create: jest.fn().mockReturnValue({})
    },
    SAMPLE_RATE: 16000,
    NUM_CHANNELS: 1,
    SPEECH_THRESHOLD: 0.03,
    REQUIRED_CONSECUTIVE_FRAMES: 4
  };
  
  // Mock AI_AUDIO
  global.AI_AUDIO = {
    enqueueAudioFromProto: jest.fn(),
    convertFloat32ToS16PCM: jest.fn().mockReturnValue(new Int16Array(10)),
    calculateRMS: jest.fn(),
    stopAllAIAudio: jest.fn(),
    audioContext: {
      createScriptProcessor: jest.fn().mockReturnValue({
        connect: jest.fn(),
        onaudioprocess: null
      }),
      createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn()
      }),
      createAnalyser: jest.fn().mockReturnValue({
        fftSize: 0,
        frequencyBinCount: 1024
      }),
      destination: {}
    },
    scriptProcessor: null,
    source: null,
    analyser: null,
    dataArray: null,
    microphoneStream: null
  };
  
  // Mock AI_STATE
  global.AI_STATE = {
    isPlaying: true,
    isSpeaking: false,
    isAIResponding: false,
    isBeingInterrupted: false,
    silenceTimeout: null
  };
  
  // Mock AI_TRANSCRIPT
  global.AI_TRANSCRIPT = {
    addMessageToTranscript: jest.fn()
  };
  
  // Mock AI_VISUALIZER
  global.AI_VISUALIZER = {
    drawVisualizer: jest.fn()
  };
  
  // Mock AI_MAIN
  global.AI_MAIN = {
    stopAudio: jest.fn()
  };
  
  // Mock console methods
  global.console = {
    log: jest.fn(),
    error: jest.fn()
  };
  
  // Mock setTimeout and clearTimeout
  global.setTimeout = jest.fn().mockReturnValue(123);
  global.clearTimeout = jest.fn();
  
  // Reset window
  global.window = {
    ...originalWindow,
    AI_CONFIG: global.AI_CONFIG,
    AI_AUDIO: global.AI_AUDIO,
    AI_STATE: global.AI_STATE,
    AI_TRANSCRIPT: global.AI_TRANSCRIPT,
    AI_VISUALIZER: global.AI_VISUALIZER,
    AI_MAIN: global.AI_MAIN
  };
  
  // Mock Date.now
  global.Date.now = jest.fn().mockReturnValue(1234567890);
});

// Clean up after tests
afterEach(() => {
  global.document = originalDocument;
  global.window = originalWindow;
  global.navigator = originalNavigator;
});

describe('WebSocket Module', () => {
  test('AI_WEBSOCKET should export expected functions', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Check that websocket object is exported correctly
    expect(window.AI_WEBSOCKET).toBeDefined();
    expect(typeof window.AI_WEBSOCKET).toBe('object');
    
    // Check exported functions
    expect(typeof window.AI_WEBSOCKET.initWebSocket).toBe('function');
    expect(typeof window.AI_WEBSOCKET.closeWebSocket).toBe('function');
    expect(typeof window.AI_WEBSOCKET.sendInterruptionSignal).toBe('function');
    expect(typeof window.AI_WEBSOCKET.handleBotInterruption).toBe('function');
  });
  
  test('initWebSocket should create WebSocket and set up event listeners', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Call initWebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Check that WebSocket constructor was called correctly
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8765');
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Check that binaryType was set
    expect(mockWs.binaryType).toBe('arraybuffer');
    
    // Check that event listeners were added
    expect(mockWs.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWs.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWs.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWs.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });
  
  test('initWebSocket should do nothing if Frame is not initialized', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Remove Frame
    AI_CONFIG.Frame = null;
    
    // Call initWebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Check that WebSocket constructor was not called
    expect(WebSocket).not.toHaveBeenCalled();
    
    // Check that console.error was called
    expect(console.error).toHaveBeenCalledWith(
      'Frame object not initialized. Please wait for protobuf initialization to complete.'
    );
  });
  
  test('handleWebSocketOpen should set up audio pipeline', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Call initWebSocket to set up WebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Get the open event handler
    const openHandler = mockWs.addEventListener.mock.calls.find(
      call => call[0] === 'open'
    )[1];
    
    // Call the open event handler
    openHandler({ type: 'open' });
    
    // Check that getUserMedia was called with correct parameters
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        sampleRate: AI_CONFIG.SAMPLE_RATE,
        channelCount: AI_CONFIG.NUM_CHANNELS,
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });
  });
  
  test('handleWebSocketMessage should process different frame types', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Set up AI_CONFIG.Frame.decode to return different frame types
    AI_CONFIG.Frame.decode.mockImplementation((data) => {
      // Return a different frame type based on the test case
      if (data[0] === 1) {
        return { transcription: { text: 'Hello world' } };
      } else if (data[0] === 2) {
        return { audio: { audio: [1, 2, 3] } };
      } else if (data[0] === 3) {
        return { botInterruption: { id: 1234 } };
      } else if (data[0] === 4) {
        return { end: { id: 5678 } };
      }
      return {};
    });
    
    // Call initWebSocket to set up WebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Get the message event handler
    const messageHandler = mockWs.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];
    
    // Test transcription frame
    messageHandler({ data: new Uint8Array([1]).buffer });
    expect(AI_TRANSCRIPT.addMessageToTranscript).toHaveBeenCalledWith('Hello world', 'user');
    
    // Reset mock calls
    jest.clearAllMocks();
    
    // Test audio frame
    messageHandler({ data: new Uint8Array([2]).buffer });
    expect(AI_AUDIO.enqueueAudioFromProto).toHaveBeenCalled();
    
    // Reset mock calls
    jest.clearAllMocks();
    
    // Test bot interruption frame
    messageHandler({ data: new Uint8Array([3]).buffer });
    expect(AI_STATE.isBeingInterrupted).toBe(true);
    expect(AI_AUDIO.stopAllAIAudio).toHaveBeenCalled();
    
    // Reset isBeingInterrupted
    AI_STATE.isBeingInterrupted = false;
    jest.clearAllMocks();
    
    // Test end frame
    messageHandler({ data: new Uint8Array([4]).buffer });
    expect(AI_MAIN.stopAudio).toHaveBeenCalledWith(true);
  });
  
  test('handleWebSocketMessage should handle decoding errors', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Make decode throw an error
    AI_CONFIG.Frame.decode.mockImplementation(() => {
      throw new Error('Decoding error');
    });
    
    // Call initWebSocket to set up WebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Get the message event handler
    const messageHandler = mockWs.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];
    
    // Call the message handler with some data
    messageHandler({ data: new Uint8Array([1, 2, 3]).buffer });
    
    // Check that console.error was called
    expect(console.error).toHaveBeenCalledWith('Error decoding message:', expect.any(Error));
  });
  
  test('sendInterruptionSignal should send an interruption frame', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Set up AI_STATE
    AI_STATE.isAIResponding = true;
    
    // Call initWebSocket to set up WebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Call sendInterruptionSignal
    window.AI_WEBSOCKET.sendInterruptionSignal();
    
    // Check that Frame.create was called with the correct arguments
    expect(AI_CONFIG.Frame.create).toHaveBeenCalledWith({
      botInterruption: {
        id: expect.any(Number)
      }
    });
    
    // Check that the frame was sent
    expect(mockWs.send).toHaveBeenCalled();
    
    // Check that AI_STATE was updated
    expect(AI_STATE.isBeingInterrupted).toBe(true);
    expect(AI_AUDIO.stopAllAIAudio).toHaveBeenCalled();
    expect(AI_STATE.isAIResponding).toBe(false);
    
    // Check that a system message was added
    expect(AI_TRANSCRIPT.addMessageToTranscript).toHaveBeenCalledWith('User interrupted AI', 'system');
    
    // Check that setTimeout was called
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
  });
  
  test('handleBotInterruption should update state and stop audio', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Call handleBotInterruption
    window.AI_WEBSOCKET.handleBotInterruption();
    
    // Check that AI_STATE was updated
    expect(AI_STATE.isBeingInterrupted).toBe(true);
    expect(AI_AUDIO.stopAllAIAudio).toHaveBeenCalled();
    expect(AI_STATE.isAIResponding).toBe(false);
    
    // Check that a system message was added
    expect(AI_TRANSCRIPT.addMessageToTranscript).toHaveBeenCalledWith('AI was interrupted', 'system');
    
    // Check that setTimeout was called
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
  });
  
  test('closeWebSocket should close the WebSocket connection', () => {
    // Import the module under test
    require('../websocket.js');
    
    // Call initWebSocket to set up WebSocket
    window.AI_WEBSOCKET.initWebSocket();
    
    // Get the mock WebSocket instance
    const mockWs = WebSocket.mock.results[0].value;
    
    // Call closeWebSocket
    window.AI_WEBSOCKET.closeWebSocket();
    
    // Check that close was called
    expect(mockWs.close).toHaveBeenCalled();
  });
  
  test('closeWebSocket should handle null WebSocket', () => {
    // Import the module under test
    require('../websocket.js');
    
    // This should not throw an error
    expect(() => {
      window.AI_WEBSOCKET.closeWebSocket();
    }).not.toThrow();
  });
});