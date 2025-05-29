// Audio context and related variables
let audioContext = null;
let microphoneStream = null;
let scriptProcessor = null;
let source = null;
let analyser = null;
let dataArray = null;

// Queue for AI audio playback
let audioQueue = [];
let isProcessingQueue = false;
let currentAudioSource = null;

// Initialize audio context with better error handling
function initAudioContext() {
  console.log('Initializing Audio Context...');
  try {
    // Check if AudioContext is supported
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.error('AudioContext not supported in this browser');
      AI_TRANSCRIPT.addMessageToTranscript('Audio not supported in this browser. Please try Chrome or Firefox.', 'system');
      return false;
    }

    // Create audio context with proper vendor prefix handling
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: AI_CONFIG.SAMPLE_RATE
    });
    
    console.log('Audio Context initialized successfully:', audioContext);
    console.log('Audio Context state:', audioContext.state);
    
    // Handle suspended state (common in browsers that require user interaction)
    if (audioContext.state === 'suspended') {
      console.warn('Audio Context is suspended. Waiting for user interaction...');
      AI_TRANSCRIPT.addMessageToTranscript('Click or tap to enable audio playback', 'system');
      
      // Add event listeners to resume audio context on user interaction
      const resumeAudioContext = () => {
        console.log('Attempting to resume Audio Context...');
        audioContext.resume().then(() => {
          console.log('Audio Context resumed successfully:', audioContext.state);
        }).catch(err => {
          console.error('Failed to resume Audio Context:', err);
        });
      };
      
      // Add various interaction events to resume audio
      document.addEventListener('click', resumeAudioContext, { once: true });
      document.addEventListener('touchstart', resumeAudioContext, { once: true });
      document.addEventListener('keydown', resumeAudioContext, { once: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Audio Context:', error);
    AI_TRANSCRIPT.addMessageToTranscript('Failed to initialize audio system: ' + error.message, 'system');
    return false;
  }
}

// Convert Float32Array to Int16Array for WebSocket transmission
function convertFloat32ToS16PCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Convert float32 to int16
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Calculate RMS (Root Mean Square) value for audio signal
function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

// Process audio from protobuf message and add to playback queue
function enqueueAudioFromProto(arrayBuffer) {
  try {
    // Decode the protobuf message
    const frame = AI_CONFIG.Frame.decode(new Uint8Array(arrayBuffer));
    
    if (!frame.audio || !frame.audio.audio || !frame.audio.audio.length) {
      console.warn('Received empty audio frame');
      return;
    }
    
    console.log('Processing audio frame:', {
      sampleRate: frame.audio.sampleRate,
      numChannels: frame.audio.numChannels,
      dataLength: frame.audio.audio.length
    });
    
    // Set AI responding state
    AI_STATE.isAIResponding = true;
    
    // Skip if being interrupted
    if (AI_STATE.isBeingInterrupted) {
      console.log('Audio skipped due to interruption');
      return;
    }
    
    // Create audio buffer from the received data
    const audioData = new Uint8Array(frame.audio.audio);
    
    // Add to queue for processing
    audioQueue.push({
      data: audioData,
      sampleRate: frame.audio.sampleRate,
      numChannels: frame.audio.numChannels
    });
    
    console.log('Audio added to queue. Queue length:', audioQueue.length);
    
    // Start processing the queue if not already processing
    if (!isProcessingQueue) {
      processAudioQueue();
    }
  } catch (error) {
    console.error('Error processing audio from protobuf:', error);
  }
}

// Process audio queue sequentially
function processAudioQueue() {
  if (audioQueue.length === 0 || AI_STATE.isBeingInterrupted) {
    console.log('Audio queue empty or interrupted, stopping queue processing');
    isProcessingQueue = false;
    
    // Reset AI responding state if queue is empty
    if (audioQueue.length === 0) {
      AI_STATE.isAIResponding = false;
    }
    return;
  }
  
  isProcessingQueue = true;
  const audioItem = audioQueue.shift();
  
  try {
    console.log('Processing audio from queue, remaining items:', audioQueue.length);
    
    // Make sure audioContext is initialized and resumed
    if (!audioContext || audioContext.state !== 'running') {
      console.warn('Audio Context not running, attempting to resume...');
      
      if (!audioContext) {
        if (!initAudioContext()) {
          console.error('Failed to initialize Audio Context');
          isProcessingQueue = false;
          return;
        }
      } else {
        audioContext.resume().catch(err => {
          console.error('Failed to resume Audio Context:', err);
          isProcessingQueue = false;
          return;
        });
      }
    }
    
    // Convert audio data to AudioBuffer
    const audioArrayBuffer = audioItem.data.buffer;
    const audioBuffer = audioContext.createBuffer(
      audioItem.numChannels,
      audioArrayBuffer.byteLength / (2 * audioItem.numChannels),
      audioItem.sampleRate
    );
    
    // Fill the AudioBuffer with the audio data
    const channelData = new Float32Array(audioBuffer.length);
    const view = new DataView(audioArrayBuffer);
    
    for (let i = 0; i < audioBuffer.length; i++) {
      const offset = i * 2;
      const sample = view.getInt16(offset, true);
      channelData[i] = sample / 32768.0;
    }
    
    audioBuffer.copyToChannel(channelData, 0);
    
    // Create audio source and play
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Store current source for potential interruption
    currentAudioSource = source;
    
    // Log when audio starts playing
    console.log('Starting audio playback, duration:', audioBuffer.duration.toFixed(2) + 's');
    
    // Play the audio
    source.start();
    
    // Set up event for when audio finishes playing
    source.onended = () => {
      console.log('Audio playback completed');
      currentAudioSource = null;
      
      // Small delay before processing next item to prevent audio glitches
      setTimeout(() => {
        processAudioQueue();
      }, 50);
    };
  } catch (error) {
    console.error('Error playing audio:', error);
    currentAudioSource = null;
    
    // Continue with next item despite error
    setTimeout(() => {
      processAudioQueue();
    }, 50);
  }
}

// Stop all currently playing AI audio
function stopAllAIAudio() {
  console.log('Stopping all AI audio playback');
  
  // Stop current audio source if it exists
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      console.log('Stopped current audio playback');
    } catch (error) {
      console.error('Error stopping current audio:', error);
    }
    currentAudioSource = null;
  }
  
  // Clear the audio queue
  console.log('Clearing audio queue, had', audioQueue.length, 'items');
  audioQueue = [];
  
  // Reset processing flag
  isProcessingQueue = false;
}

// Clean up audio resources
function cleanupAudio() {
  console.log('Cleaning up audio resources');
  
  // Stop any playing audio
  stopAllAIAudio();
  
  // Disconnect and clean up audio processing nodes
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor.onaudioprocess = null;
    scriptProcessor = null;
    console.log('Script processor disconnected');
  }
  
  if (source) {
    source.disconnect();
    source = null;
    console.log('Audio source disconnected');
  }
  
  if (analyser) {
    analyser.disconnect();
    analyser = null;
    console.log('Analyser disconnected');
  }
  
  // Stop microphone stream
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => {
      track.stop();
      console.log('Microphone track stopped');
    });
    microphoneStream = null;
  }
  
  // Close audio context
  if (audioContext) {
    audioContext.close().then(() => {
      console.log('Audio context closed successfully');
    }).catch(err => {
      console.error('Error closing audio context:', err);
    });
    audioContext = null;
  }
}

// Export audio functionality
window.AI_AUDIO = {
  initAudioContext,
  convertFloat32ToS16PCM,
  calculateRMS,
  enqueueAudioFromProto,
  stopAllAIAudio,
  cleanupAudio,
  get audioContext() { return audioContext; },
  set audioContext(ctx) { audioContext = ctx; },
  get microphoneStream() { return microphoneStream; },
  set microphoneStream(stream) { microphoneStream = stream; },
  get scriptProcessor() { return scriptProcessor; },
  set scriptProcessor(processor) { scriptProcessor = processor; },
  get source() { return source; },
  set source(src) { source = src; },
  get analyser() { return analyser; },
  set analyser(a) { analyser = a; },
  get dataArray() { return dataArray; },
  set dataArray(array) { dataArray = array; }
};
