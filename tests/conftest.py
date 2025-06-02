import os
import sys
import pytest
from unittest.mock import MagicMock, AsyncMock

# Add the parent directory to sys.path to allow importing from the project
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock environment variables
@pytest.fixture
def mock_env_vars(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test_openai_key")
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test_deepgram_key")
    monkeypatch.setenv("CARTESIA_API_KEY", "test_cartesia_key")

# Mock services
@pytest.fixture
def mock_llm_service():
    mock = MagicMock()
    mock.create_context_aggregator = MagicMock(return_value=MagicMock())
    return mock

@pytest.fixture
def mock_stt_service():
    return MagicMock()

@pytest.fixture
def mock_tts_service():
    mock = MagicMock()
    mock.say = AsyncMock()
    return mock

@pytest.fixture
def mock_websocket_transport():
    mock = MagicMock()
    mock.input = MagicMock(return_value=MagicMock())
    mock.output = MagicMock(return_value=MagicMock())
    mock.event_handler = MagicMock(return_value=lambda func: func)
    return mock

@pytest.fixture
def mock_pipeline():
    return MagicMock()

@pytest.fixture
def mock_runner():
    mock = MagicMock()
    mock.run = AsyncMock()
    return mock