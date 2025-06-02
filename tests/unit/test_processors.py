import asyncio
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from bot import AIResponseProcessor
from pipecat.frames.frames import TextFrame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameProcessor

class TestAIResponseProcessor:
    """Unit tests for the AIResponseProcessor class."""
    
    def test_init(self):
        """Test that AIResponseProcessor initializes correctly."""
        processor = AIResponseProcessor()
        # Verify the processor was created successfully
        assert processor is not None
    
    @pytest.mark.asyncio
    async def test_process_frame_text_frame(self):
        """Test that processing a TextFrame creates a TranscriptionFrame."""
        # Create the processor
        processor = AIResponseProcessor()
        
        # Patch super().process_frame to return what's passed to it
        with patch.object(FrameProcessor, 'process_frame', new=AsyncMock(side_effect=lambda frames, direction: frames)):
            # Create a TextFrame
            text_frame = TextFrame(text="Hello, this is a test message.")
            
            # Process the frame
            result = await processor.process_frame(text_frame, "forward")
            
            # Check that there are two frames in the result
            assert len(result) == 2
            
            # Check that the first frame is the original TextFrame
            assert result[0] == text_frame
            
            # Check that the second frame is a TranscriptionFrame with the correct properties
            assert isinstance(result[1], TranscriptionFrame)
            assert result[1].text == "Hello, this is a test message."
            assert result[1].user_id == "ai_assistant"
            
            # Verify the timestamp is present
            assert result[1].timestamp is not None
    
    @pytest.mark.asyncio
    async def test_process_frame_non_text_frame(self):
        """Test that processing a non-TextFrame only passes the original frame."""
        # Create the processor
        processor = AIResponseProcessor()
        
        # Patch super().process_frame to return what's passed to it
        with patch.object(FrameProcessor, 'process_frame', new=AsyncMock(side_effect=lambda frames, direction: frames)):
            # Create a non-TextFrame (mock it)
            non_text_frame = MagicMock()
            non_text_frame.__class__ = MagicMock  # Ensure it's not a TextFrame
            
            # Process the frame
            result = await processor.process_frame(non_text_frame, "forward")
            
            # Check that there is only one frame in the result (the original)
            assert len(result) == 1
            assert result[0] == non_text_frame
    
    @pytest.mark.asyncio
    async def test_process_frame_empty_text(self):
        """Test that processing a TextFrame with empty text still creates a TranscriptionFrame."""
        # Create the processor
        processor = AIResponseProcessor()
        
        # Patch super().process_frame to return what's passed to it
        with patch.object(FrameProcessor, 'process_frame', new=AsyncMock(side_effect=lambda frames, direction: frames)):
            # Create a TextFrame with empty text
            text_frame = TextFrame(text="")
            
            # Process the frame
            result = await processor.process_frame(text_frame, "forward")
            
            # Check that there are two frames in the result
            assert len(result) == 2
            
            # Check that the second frame is a TranscriptionFrame with empty text
            assert isinstance(result[1], TranscriptionFrame)
            assert result[1].text == ""
            assert result[1].user_id == "ai_assistant"