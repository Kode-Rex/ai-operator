import datetime
from loguru import logger
from pipecat.frames.frames import LLMTextFrame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

class TextTranscriptionProcessor(FrameProcessor):
    """
    Processor that converts LLM text frames to transcription frames with 'ai' user_id.
    This allows AI responses to be displayed in the UI transcript.
    """
    def __init__(self, transport, serializer):
        super().__init__()
        self.transport = transport
        self.serializer = serializer
        logger.info("TextTranscriptionProcessor initialized")
    
    async def process_frame(self, frame, direction=None):
        # Call the parent's process_frame method first
        await super().process_frame(frame, direction)
        
        # If this is an LLMTextFrame, create a transcription frame
        if isinstance(frame, LLMTextFrame):
            text = frame.text if hasattr(frame, 'text') else str(frame)
            logger.debug(f"TextTranscriptionProcessor: Processing LLMTextFrame: {text}")
            
            # First pass through the original frame for TTS conversion
            await self.push_frame(frame, direction)
            
            try:
                # Create a TranscriptionFrame with explicit field values
                timestamp = datetime.datetime.now().isoformat()
                
                # Debug the frame creation
                logger.debug(f"Creating TranscriptionFrame with: text='{text}', user_id='ai', timestamp='{timestamp}'")
                
                transcription_frame = TranscriptionFrame(
                    id=123456,  # Add an ID field
                    name="AI Transcription",  # Add a name field
                    text=text,
                    user_id="ai",  # This must be explicitly set to 'ai'
                    timestamp=timestamp
                )
                
                # Debug the created frame
                logger.debug(f"Created TranscriptionFrame: {transcription_frame}")
                
                # Try to use the transport's output method
                if hasattr(self.transport, 'output'):
                    logger.debug(f"Pushing TranscriptionFrame to transport output")
                    await self.transport.output().push_frame(transcription_frame, FrameDirection.DOWNSTREAM)
                else:
                    # Fallback: push directly to pipeline
                    logger.debug(f"Pushing TranscriptionFrame directly to pipeline")
                    await self.push_frame(transcription_frame, direction)
                
                logger.info(f"Sent AI transcription: '{text}'")
            except Exception as e:
                logger.error(f"Error creating or sending transcription frame: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            # For any non-LLMTextFrame, just pass it through
            await self.push_frame(frame, direction)
