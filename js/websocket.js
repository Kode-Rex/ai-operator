// WebSocket connection
let ws = null;

// Initialize WebSocket connection
function initWebSocket() {
  // Make sure Frame is initialized before proceeding
  if (!AI_CONFIG.Frame) {
    console.error('Frame object not initialized. Please wait for protobuf initialization to complete.');
    return;
  }

  console.log('Initializing WebSocket connection to ws://localhost:8765...');
  ws = new WebSocket('ws://localhost:8765');
  // This is so `event.data` is already an ArrayBuffer.
  ws.binaryType = 'arraybuffer';

  ws.addEventListener('open', handleWebSocketOpen);
  ws.addEventListener('message', handleWebSocketMessage);
  ws.addEventListener('close', (event) => {
    console.log('WebSocket connection closed.', event.code, event.reason);
    AI_MAIN.stopAudio(false);
  });
  ws.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
    AI_TRANSCRIPT.addMessageToTranscript('WebSocket error occurred. Please check console for details.', 'system');
  });
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(event) {
  const arrayBuffer = event.data;
  if (AI_STATE.isPlaying && AI_CONFIG.Frame) {
    try {
      const parsedFrame = AI_CONFIG.Frame.decode(new Uint8Array(arrayBuffer));
      console.debug('Received frame type:', Object.keys(parsedFrame)[0]);

      // Handle transcription messages
      if (parsedFrame?.transcription) {
        console.log('Transcription received:', parsedFrame.transcription.text);
        AI_TRANSCRIPT.addMessageToTranscript(parsedFrame.transcription.text, 'user');
      }
      
      // Handle AI response text messages (TextFrames with name="ai_response")
      if (parsedFrame?.text) {
        console.log('TextFrame received:', parsedFrame.text);
        
        if (parsedFrame.text.name === "ai_response") {
          console.log('AI Response TextFrame detected!');
          console.log('AI Response content:', parsedFrame.text.text);
          AI_TRANSCRIPT.addMessageToTranscript(parsedFrame.text.text, 'ai');
        } else {
          console.log('TextFrame received but not an AI response (name=' + parsedFrame.text.name + ')');
        }
      }
      
      // Handle audio messages
      if (parsedFrame?.audio) {
        console.debug('Audio frame received, length:', parsedFrame.audio.audio.length);
        AI_AUDIO.enqueueAudioFromProto(arrayBuffer);
      }
      
      // Handle bot interruption frame
      if (parsedFrame?.botInterruption) {
        console.log('Bot interruption received, stopping AI audio');
        handleBotInterruption();
      }
      
      // Handle end frame
      if (parsedFrame?.end) {
        console.log('End frame received');
        AI_MAIN.stopAudio(true);
      }
    } catch (error) {
      console.error('Error decoding message:', error);
      console.error('ArrayBuffer size:', arrayBuffer.byteLength);
      AI_TRANSCRIPT.addMessageToTranscript('Error processing message from server', 'system');
    }
  } else {
    console.warn('Received message but AI_STATE.isPlaying is false or Frame is not initialized');
  }
}

// Handle WebSocket open event
function handleWebSocketOpen(event) {
  console.log('WebSocket connection established!', event);
  AI_TRANSCRIPT.addMessageToTranscript('Connected to server', 'system');

  navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: AI_CONFIG.SAMPLE_RATE,
      channelCount: AI_CONFIG.NUM_CHANNELS,
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    }
  }).then((stream) => {
    console.log('Microphone access granted, setting up audio processing');
    AI_AUDIO.microphoneStream = stream;
    
    // Create script processor for audio processing
    AI_AUDIO.scriptProcessor = AI_AUDIO.audioContext.createScriptProcessor(512, 1, 1);
    AI_AUDIO.source = AI_AUDIO.audioContext.createMediaStreamSource(stream);
    
    // Set up visualizer for input
    AI_AUDIO.analyser = AI_AUDIO.audioContext.createAnalyser();
    AI_AUDIO.analyser.fftSize = 2048;
    AI_AUDIO.source.connect(AI_AUDIO.analyser);
    AI_AUDIO.dataArray = new Uint8Array(AI_AUDIO.analyser.frequencyBinCount);
    AI_VISUALIZER.drawVisualizer();

    // Connect input to script processor and destination
    AI_AUDIO.source.connect(AI_AUDIO.scriptProcessor);
    AI_AUDIO.scriptProcessor.connect(AI_AUDIO.audioContext.destination);

    // Set up audio processing
    setupAudioProcessing();
  }).catch((error) => {
    console.error('Error accessing microphone:', error);
    AI_TRANSCRIPT.addMessageToTranscript('Error accessing microphone. Please check permissions.', 'system');
  });
}

// Set up audio processing with speech detection
function setupAudioProcessing() {
  // Variables for better speech detection
  let consecutiveFramesAboveThreshold = 0;
  
  AI_AUDIO.scriptProcessor.onaudioprocess = (event) => {
    if (!ws || !AI_CONFIG.Frame) {
      console.warn('WebSocket or Frame not initialized in audio processing');
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not in OPEN state, readyState:', ws.readyState);
      return;
    }

    const audioData = event.inputBuffer.getChannelData(0);
    const pcmS16Array = AI_AUDIO.convertFloat32ToS16PCM(audioData);
    const pcmByteArray = new Uint8Array(pcmS16Array.buffer);
    
    try {
      const frame = AI_CONFIG.Frame.create({
        audio: {
          audio: Array.from(pcmByteArray),
          sampleRate: AI_CONFIG.SAMPLE_RATE,
          numChannels: AI_CONFIG.NUM_CHANNELS
        }
      });
      const encodedFrame = new Uint8Array(AI_CONFIG.Frame.encode(frame).finish());
      ws.send(encodedFrame);
    } catch (error) {
      console.error('Error creating or encoding frame:', error);
      return;
    }

    // Check for speech with improved detection
    const rms = AI_AUDIO.calculateRMS(audioData);
    
    if (rms > AI_CONFIG.SPEECH_THRESHOLD) {
      consecutiveFramesAboveThreshold++;
      
      // Only consider it speech if we've had multiple frames above threshold
      if (!AI_STATE.isSpeaking && consecutiveFramesAboveThreshold >= AI_CONFIG.REQUIRED_CONSECUTIVE_FRAMES) {
        AI_STATE.isSpeaking = true;
        AI_TRANSCRIPT.addMessageToTranscript('User speaking...', 'user');
        console.log('Speech detected, RMS:', rms);
        
        // Check if AI is currently responding and send interruption if so
        if (AI_STATE.isAIResponding) {
          sendInterruptionSignal();
        }
      }
      
      if (AI_STATE.silenceTimeout) {
        clearTimeout(AI_STATE.silenceTimeout);
      }
      
      AI_STATE.silenceTimeout = setTimeout(() => {
        AI_STATE.isSpeaking = false;
        console.log('Speech ended, silence detected');
      }, 1500); // Longer timeout (1.5 seconds) for more stable detection
    } else {
      // Reset consecutive frames counter when below threshold
      consecutiveFramesAboveThreshold = 0;
    }
  };
}

// Send interruption signal to the server to stop AI response
function sendInterruptionSignal() {
  if (!ws || !AI_STATE.isAIResponding || !AI_CONFIG.Frame) return;
  
  console.log('Sending interruption signal to stop AI response');
  
  try {
    // Set interruption flag to prevent new audio chunks from being played
    AI_STATE.isBeingInterrupted = true;
    
    // Send an interruption frame to the server
    const interruptFrame = AI_CONFIG.Frame.create({
      botInterruption: {
        id: Date.now()
      }
    });
    
    // Encode and send the interruption signal
    const encodedInterrupt = new Uint8Array(AI_CONFIG.Frame.encode(interruptFrame).finish());
    ws.send(encodedInterrupt);
    
    // Stop all currently playing AI audio immediately
    AI_AUDIO.stopAllAIAudio();
    
    // Reset AI response state
    AI_STATE.isAIResponding = false;
    
    // Add system message indicating interruption
    AI_TRANSCRIPT.addMessageToTranscript('User interrupted AI', 'system');
    
    // Reset the interruption flag after a short delay to allow new audio
    setTimeout(() => {
      AI_STATE.isBeingInterrupted = false;
      console.log('User interruption state reset, ready for new audio');
    }, 500); // 500ms delay should be enough to process the interruption
  } catch (error) {
    console.error('Error sending interruption signal:', error);
  }
}

// Handle bot interruption
function handleBotInterruption() {
  // Set interruption flag to prevent new audio chunks from being played
  AI_STATE.isBeingInterrupted = true;
  
  // Stop all currently playing AI audio
  AI_AUDIO.stopAllAIAudio();
  
  // Reset AI response state
  AI_STATE.isAIResponding = false;
  
  // Add system message indicating interruption
  AI_TRANSCRIPT.addMessageToTranscript('AI was interrupted', 'system');
  
  // Reset the interruption flag after a short delay to allow new audio
  setTimeout(() => {
    AI_STATE.isBeingInterrupted = false;
    console.log('Interruption state reset, ready for new audio');
  }, 500); // 500ms delay should be enough to process the interruption
}

// Close WebSocket connection
function closeWebSocket() {
  if (ws) {
    console.log('Closing WebSocket connection');
    ws.close();
    ws = null;
  }
}

// Export WebSocket functionality
window.AI_WEBSOCKET = {
  initWebSocket,
  closeWebSocket,
  sendInterruptionSignal,
  handleBotInterruption,
  get ws() { return ws; }
}; 
