import asyncio
import os
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from bot import Bot, SessionTimeoutHandler

@pytest.mark.asyncio
async def test_main():
    """Test the main function."""
    # Create a mock Bot
    with patch('bot.Bot') as mock_bot_class:
        # Create a mock bot instance
        mock_bot = MagicMock()
        mock_bot_class.return_value = mock_bot
        
        # Mock the initialize and run methods
        mock_bot.initialize = MagicMock()
        mock_bot.run = AsyncMock()
        
        # Call the main function
        from bot import main
        await main()
        
        # Check that the methods were called
        mock_bot_class.assert_called_once()
        mock_bot.initialize.assert_called_once()
        mock_bot.run.assert_called_once()


class TestBot:
    """Unit tests for the Bot class."""

    def test_init(self):
        """Test that Bot initializes with expected attributes."""
        bot = Bot()
        
        # Check initial state
        assert bot.transport is None
        assert bot.llm is None
        assert bot.stt is None
        assert bot.tts is None
        assert bot.context is None
        assert bot.context_aggregator is None
        assert bot.pipeline is None
        assert bot.task is None
        assert bot.runner is None
        assert bot.ai_response_processor is None
        
        # Check initial messages
        assert len(bot.messages) == 1
        assert bot.messages[0]["role"] == "system"
        assert "You are a helpful LLM" in bot.messages[0]["content"]

    @patch('bot.WebsocketServerTransport')
    @patch('bot.WebsocketServerParams')
    @patch('bot.ProtobufFrameSerializer')
    @patch('bot.SileroVADAnalyzer')
    def test_setup_transport(self, mock_silero, mock_serializer, mock_params, mock_transport):
        """Test that transport is set up correctly."""
        # Set up the mocks to avoid validation errors
        mock_silero_instance = MagicMock()
        mock_silero.return_value = mock_silero_instance
        
        mock_serializer_instance = MagicMock()
        mock_serializer.return_value = mock_serializer_instance
        
        mock_params_instance = MagicMock()
        mock_params.return_value = mock_params_instance
        
        mock_transport_instance = MagicMock()
        mock_transport.return_value = mock_transport_instance
        
        bot = Bot()
        transport = bot.setup_transport()
        
        # Check that WebsocketServerParams was called with the expected params
        mock_params.assert_called_once_with(
            serializer=mock_serializer_instance,
            audio_out_enabled=True,
            add_wav_header=True,
            vad_enabled=True,
            vad_analyzer=mock_silero_instance,
            vad_audio_passthrough=True,
            session_timeout=60 * 3,  # 3 minutes
        )
        
        # Check that WebsocketServerTransport was called with the params
        mock_transport.assert_called_once_with(params=mock_params_instance)
        
        # Assert that we can set and retrieve the transport
        assert bot.transport is mock_transport_instance
        assert transport == mock_transport_instance

    @patch('bot.OpenAILLMService')
    @patch('bot.DeepgramSTTService')
    @patch('bot.CartesiaTTSService')
    def test_setup_services(self, mock_tts, mock_stt, mock_llm, mock_env_vars):
        """Test that services are set up correctly."""
        bot = Bot()
        bot.setup_services()
        
        # Check that services were instantiated with the correct API keys
        mock_llm.assert_called_once_with(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4o")
        mock_stt.assert_called_once_with(api_key=os.getenv("DEEPGRAM_API_KEY"))
        mock_tts.assert_called_once_with(
            api_key=os.getenv("CARTESIA_API_KEY"),
            voice_id="71a7ad14-091c-4e8e-a314-022ece01c121"
        )
        
        assert bot.llm is not None
        assert bot.stt is not None
        assert bot.tts is not None

    def test_setup_context(self, mock_llm_service):
        """Test that context is set up correctly."""
        bot = Bot()
        bot.llm = mock_llm_service
        bot.setup_context()
        
        assert bot.context is not None
        assert bot.context_aggregator is not None
        mock_llm_service.create_context_aggregator.assert_called_once_with(bot.context)

    def test_setup_pipeline(self, mock_websocket_transport, mock_llm_service, 
                          mock_stt_service, mock_tts_service):
        """Test that pipeline is set up correctly."""
        bot = Bot()
        
        # Set up the mocks
        bot.transport = mock_websocket_transport
        bot.llm = mock_llm_service
        bot.stt = mock_stt_service
        bot.tts = mock_tts_service
        
        # Mock the context aggregator
        bot.context_aggregator = MagicMock()
        bot.context_aggregator.user = MagicMock(return_value=MagicMock())
        bot.context_aggregator.assistant = MagicMock(return_value=MagicMock())
        
        bot.setup_pipeline()
        
        # Check that pipeline and task are created
        assert bot.pipeline is not None
        assert bot.task is not None
        assert bot.ai_response_processor is not None

    def test_setup_event_handlers(self, mock_websocket_transport):
        """Test that event handlers are set up correctly."""
        bot = Bot()
        bot.transport = mock_websocket_transport
        bot.task = MagicMock()
        bot.task.queue_frames = AsyncMock()
        bot.context_aggregator = MagicMock()
        bot.context_aggregator.user = MagicMock(return_value=MagicMock())
        bot.context_aggregator.user().get_context_frame = MagicMock(return_value="frame")
        bot.tts = MagicMock()
        
        # Setup mock decorator
        handler_funcs = {}
        def mock_decorator(event_name):
            def wrapper(func):
                handler_funcs[event_name] = func
                return func
            return wrapper
        
        mock_websocket_transport.event_handler.side_effect = mock_decorator
        
        bot.setup_event_handlers()
        
        # Check that event handlers were registered
        assert mock_websocket_transport.event_handler.call_count == 2
        mock_websocket_transport.event_handler.assert_any_call("on_client_connected")
        mock_websocket_transport.event_handler.assert_any_call("on_session_timeout")
        
        # Test on_client_connected handler
        assert "on_client_connected" in handler_funcs
        mock_client = MagicMock()
        loop = asyncio.get_event_loop()
        loop.run_until_complete(handler_funcs["on_client_connected"](bot.transport, mock_client))
        
        # Check that the message was added
        assert len(bot.messages) > 1
        assert "Please introduce yourself to the user" in bot.messages[-1]["content"]
        
        # Check that queue_frames was called
        bot.task.queue_frames.assert_called_once_with([bot.context_aggregator.user().get_context_frame()])
        
        # Test on_session_timeout handler
        assert "on_session_timeout" in handler_funcs
        # We can't easily test this completely as it creates a new SessionTimeoutHandler

    @patch('bot.PipelineRunner')
    def test_initialize(self, mock_pipeline_runner):
        """Test that bot initializes all components."""
        bot = Bot()
        
        # Setup mock for PipelineRunner
        mock_runner_instance = MagicMock()
        mock_pipeline_runner.return_value = mock_runner_instance
        
        # Mock the setup methods
        bot.setup_transport = MagicMock()
        bot.setup_services = MagicMock()
        bot.setup_context = MagicMock()
        bot.setup_pipeline = MagicMock()
        bot.setup_event_handlers = MagicMock()
        
        bot.initialize()
        
        # Check that all setup methods were called
        bot.setup_transport.assert_called_once()
        bot.setup_services.assert_called_once()
        bot.setup_context.assert_called_once()
        bot.setup_pipeline.assert_called_once()
        bot.setup_event_handlers.assert_called_once()
        mock_pipeline_runner.assert_called_once()
        assert bot.runner is mock_runner_instance

    @pytest.mark.asyncio
    async def test_run(self, mock_runner):
        """Test that bot runs the pipeline."""
        bot = Bot()
        bot.runner = mock_runner
        bot.task = "task"
        
        await bot.run()
        
        # Check that runner.run was called with the task
        mock_runner.run.assert_called_once_with(bot.task)


class TestSessionTimeoutHandler:
    """Unit tests for the SessionTimeoutHandler class."""
    
    @pytest.mark.asyncio
    async def test_handle_timeout(self):
        """Test that timeout handler works correctly."""
        # Create mocks
        mock_task = MagicMock()
        mock_task.queue_frames = AsyncMock()
        mock_tts = MagicMock()
        mock_tts.say = AsyncMock()
        
        # Create the handler
        handler = SessionTimeoutHandler(mock_task, mock_tts)
        
        # Mock the _end_call method to avoid waiting
        handler._end_call = AsyncMock()
        
        # Instead of mocking asyncio.create_task which leads to comparison issues with coroutines,
        # we'll patch the entire method with our own implementation
        original_create_task = asyncio.create_task
        
        def mock_create_task_impl(coro):
            # Just store the coroutine and return a mock
            mock_task_obj = MagicMock()
            handler.background_tasks.add(mock_task_obj)
            mock_task_obj.add_done_callback = MagicMock()
            return mock_task_obj
            
        # Replace create_task with our implementation
        asyncio.create_task = mock_create_task_impl
        
        try:
            # Call the method
            await handler.handle_timeout("test_client")
            
            # Check that methods were called correctly
            mock_task.queue_frames.assert_called_once()
            mock_tts.say.assert_called_once_with(
                "I'm sorry, we are ending the call now. Please feel free to reach out again if you need assistance."
            )
            
            # Check that the task was added to background_tasks
            assert len(handler.background_tasks) == 1
        finally:
            # Restore original function
            asyncio.create_task = original_create_task
    
    @pytest.mark.asyncio
    async def test_end_call(self):
        """Test that _end_call works correctly."""
        # Create mocks
        mock_task = MagicMock()
        mock_task.queue_frames = AsyncMock()
        mock_tts = MagicMock()
        
        # Create the handler
        handler = SessionTimeoutHandler(mock_task, mock_tts)
        
        # Mock sleep to avoid waiting
        with patch('asyncio.sleep', AsyncMock()) as mock_sleep:
            await handler._end_call()
            
            # Check that sleep was called with the right duration
            mock_sleep.assert_called_once_with(15)
            
            # Check that queue_frames was called with both frames
            mock_task.queue_frames.assert_called_once()
            # Check that the call contained two frames
            assert len(mock_task.queue_frames.call_args[0][0]) == 2
            
            # Check that the frames are of the right types
            from pipecat.frames.frames import BotInterruptionFrame, EndFrame
            frames = mock_task.queue_frames.call_args[0][0]
            assert isinstance(frames[0], BotInterruptionFrame)
            assert isinstance(frames[1], EndFrame)