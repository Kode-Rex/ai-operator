// Jest setup file
require('@testing-library/jest-dom');

// Mock browser objects and globals
global.document = document;
global.window = window;
global.navigator = {
  userAgent: 'node.js',
  mediaDevices: {
    getUserMedia: jest.fn()
  }
};

// Mock console methods to avoid cluttering test output
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// Mock audio context
class AudioContext {
  constructor() {
    this.createAnalyser = jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 0,
      getByteFrequencyData: jest.fn()
    });
    this.createMediaStreamSource = jest.fn().mockReturnValue({
      connect: jest.fn()
    });
    this.createGain = jest.fn().mockReturnValue({
      connect: jest.fn(),
      gain: { value: 1.0 }
    });
    this.createScriptProcessor = jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      addEventListener: jest.fn()
    });
    this.destination = {};
  }
}

global.AudioContext = AudioContext;
global.webkitAudioContext = AudioContext;

// Mock HTMLMediaElement methods
HTMLMediaElement.prototype.pause = jest.fn();
HTMLMediaElement.prototype.play = jest.fn();

// Mock ProtoBuf
global.protobuf = {
  load: jest.fn((path, callback) => {
    callback(null, {
      lookupType: jest.fn().mockReturnValue({})
    });
  })
};

// Setup global test objects
global.AI_CONFIG = {
  SAMPLE_RATE: 16000,
  NUM_CHANNELS: 1,
  SPEECH_THRESHOLD: 0.03,
  REQUIRED_CONSECUTIVE_FRAMES: 4,
  Frame: null,
  initProtobuf: jest.fn().mockResolvedValue({})
};

global.AI_STATE = {
  isPlaying: false,
  isAIResponding: false,
  isBeingInterrupted: false,
  silenceTimeout: null
};