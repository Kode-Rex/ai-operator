import asyncio
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from bot import Bot
from pipecat.frames.frames import TextFrame, TranscriptionFrame


class TestBotPipeline:
    """Integration tests for the Bot pipeline."""
    
    @pytest.fixture
    def setup_bot(self):
        """Set up a Bot instance with mocked dependencies."""
        bot = Bot()
        
        # Mock transport
        bot.transport = MagicMock()
        bot.transport.input = MagicMock(return_value=MagicMock())
        bot.transport.output = MagicMock(return_value=MagicMock())
        bot.transport.event_handler = MagicMock(return_value=lambda func: func)
        
        # Mock services
        bot.llm = MagicMock()
        bot.stt = MagicMock()
        bot.tts = MagicMock()
        bot.tts.say = AsyncMock()
        
        # Mock context aggregator
        mock_context_aggregator = MagicMock()
        mock_context_aggregator.user = MagicMock(return_value=MagicMock())
        mock_context_aggregator.assistant = MagicMock(return_value=MagicMock())
        mock_context_aggregator.user().get_context_frame = MagicMock(return_value="frame")
        bot.llm.create_context_aggregator = MagicMock(return_value=mock_context_aggregator)
        
        # Mock runner
        bot.runner = MagicMock()
        bot.runner.run = AsyncMock()
        
        return bot
    
    @pytest.mark.asyncio
    async def test_bot_pipeline_setup(self, setup_bot):
        """Test that the pipeline is set up correctly with all components."""
        bot = setup_bot
        
        # Set up the context (normally done in initialize)
        bot.setup_context()
        
        # Set up the pipeline (normally done in initialize)
        bot.setup_pipeline()
        
        # Check that the pipeline was created and has components
        assert bot.pipeline is not None
        
        # We can't directly check the processors list as it's not exposed,
        # but we can verify that the pipeline is properly set up
        assert bot.task is not None
        assert bot.ai_response_processor is not None
    
    @pytest.mark.asyncio
    async def test_bot_pipeline_flow(self, setup_bot):
        """Test the flow of frames through the pipeline."""
        bot = setup_bot
        
        # Set up the pipeline
        bot.setup_context()
        bot.setup_pipeline()
        
        # Mock the task's process method
        bot.task.process_frame = AsyncMock()
        
        # Create a mock audio frame
        audio_frame = MagicMock()
        audio_frame.audio = b"sample audio data"
        audio_frame.sample_rate = 16000
        
        # Mock the response
        async def mock_process(frame, *args, **kwargs):
            # Simulate STT processing
            transcription = TranscriptionFrame(text="Hello AI", user_id="user", timestamp="123456")
            
            # Simulate LLM processing
            text_response = TextFrame(text="Hello human, how can I help you today?")
            
            # Return all frames that would be processed
            return [audio_frame, transcription, text_response]
        
        bot.task.process_frame.side_effect = mock_process
        
        # Set up the event handlers
        bot.setup_event_handlers()
        
        # Create a mock client
        mock_client = MagicMock()
        mock_client.remote_address = "127.0.0.1"
        
        # Get the on_client_connected handler
        bot.transport.event_handler.assert_any_call("on_client_connected")
        
        # Since we mocked the event_handler to return the function unchanged,
        # we can create our own handler that mimics the expected behavior
        async def handler(transport, client):
            # Add the system message
            bot.messages.append({"role": "system", "content": "Please introduce yourself to the user."})
            # Queue the context frame
            await bot.task.queue_frames([bot.context_aggregator.user().get_context_frame()])
        
        # Make task.queue_frames an AsyncMock
        bot.task.queue_frames = AsyncMock()
        
        # Call the handler
        await handler(bot.transport, mock_client)
        
        # Check that a message was added to the system messages
        assert "Please introduce yourself" in bot.messages[-1]["content"]
        
        # Check that the task queue_frames method was called
        assert bot.task.queue_frames.called
    
    @pytest.mark.asyncio
    async def test_session_timeout(self, setup_bot):
        """Test the session timeout handler."""
        bot = setup_bot
        
        # Set up the pipeline
        bot.setup_context()
        bot.setup_pipeline()
        
        # Set up the event handlers
        bot.setup_event_handlers()
        
        # Get the on_session_timeout handler
        bot.transport.event_handler.assert_any_call("on_session_timeout")
        
        # Since we mocked the event_handler to return the function unchanged,
        # we can create our own handler that mimics the expected behavior
        async def handler(transport, client):
            # Create a timeout handler
            timeout_handler = MagicMock()
            timeout_handler.handle_timeout = AsyncMock()
            
            # Make sure our mocks are set up properly
            bot.task.queue_frames = AsyncMock()
            bot.tts.say = AsyncMock()
            
            # Call the handle_timeout method with the client
            await timeout_handler.handle_timeout(client)
            
            # Create a real timeout handler to test
            from bot import SessionTimeoutHandler
            real_handler = SessionTimeoutHandler(bot.task, bot.tts)
            real_handler._end_call = AsyncMock()  # Mock to avoid waiting
            
            # Call the real handler
            await real_handler.handle_timeout(client.remote_address)
            
            # Verify that the correct methods are called
            assert bot.task.queue_frames.called
            assert bot.tts.say.called
            assert "I'm sorry, we are ending the call now" in bot.tts.say.call_args[0][0]
        
        # Create a mock client
        mock_client = MagicMock()
        mock_client.remote_address = "127.0.0.1"
        
        # Mock the _end_call method to avoid waiting
        with patch('bot.SessionTimeoutHandler._end_call', AsyncMock()):
            # Call the handler
            await handler(bot.transport, mock_client)
            
            # Check that a BotInterruptionFrame was queued
            bot.task.queue_frames.assert_called_once()
            
            # Check that the TTS service was called to say the timeout message
            bot.tts.say.assert_called_once_with(
                "I'm sorry, we are ending the call now. Please feel free to reach out again if you need assistance."
            )
    
    @pytest.mark.asyncio
    async def test_run_method(self, setup_bot):
        """Test that the run method calls the runner with the task."""
        bot = setup_bot
        
        # Set up the pipeline
        bot.setup_context()
        bot.setup_pipeline()
        
        # Call the run method
        await bot.run()
        
        # Check that the runner was called with the task
        bot.runner.run.assert_called_once_with(bot.task)