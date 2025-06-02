# AI Operator - Real-time Voice Conversation System

This project implements a low-latency, real-time voice conversation system with a web client. It combines specialized services to create a responsive AI assistant that can understand speech, respond intelligently, and be interrupted naturally during conversation.

See it in action: https://www.youtube.com/watch?v=iPqDASo2gsQ

[![Backend Tests](https://img.shields.io/badge/backend_tests-pytest-green.svg)](https://docs.pytest.org/en/stable/) [![Frontend Tests](https://img.shields.io/badge/frontend_tests-jest-red.svg)](https://jestjs.io/)

## Key Features

- **Real-time voice conversations** with GPT-4o
- **Low-latency responses** through WebSocket streaming
- **Natural interruption handling** - speak while AI is talking to interrupt it
- **Multi-service architecture** optimizing each part of the conversation pipeline:
  - Deepgram for speech-to-text
  - OpenAI GPT-4o for language processing
  - Cartesia TTS for high-quality voice output

## Advantages Over Other Systems

- **Speed**: Optimized for reduced latency compared to single-provider solutions
- **Voice Quality**: Uses Cartesia's "British Reading Lady" voice for natural speech
- **Interruption**: Supports natural conversation flow with immediate response to interruptions
- **Customizable**: Each component can be swapped with alternatives

## Getting Started

### Setup

```python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env # and add your API credentials
```

### Required API Keys

Add the following to your `.env` file:
- `OPENAI_API_KEY` - For GPT-4o language model
- `DEEPGRAM_API_KEY` - For speech recognition
- `CARTESIA_API_KEY` - For text-to-speech

### Run the Bot Server

```bash
python bot.py
```

### Run the Web Client

```bash
python -m http.server
```

Then, visit `http://localhost:8000` in your browser to start a conversation.

### Run the Tests

#### Python Backend Tests

```bash
# Run all Python tests
pytest

# Run with coverage report
pytest --cov=. --cov-report=html

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/
```

#### JavaScript Frontend Tests

```bash
# Run all JavaScript tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

#### Run All Tests

For convenience, you can run all tests (both backend and frontend) with:

```bash
./run_tests.sh
```

## Technical Architecture

The system uses a pipeline architecture:
1. Web client captures audio and streams to server via WebSockets
2. Speech is converted to text using Deepgram
3. Text is processed by GPT-4o
4. Responses are converted to speech using Cartesia TTS
5. Audio is streamed back to client for playback

Voice detection monitors audio levels and triggers interruption handling when the user starts speaking during AI responses.

## Testing

The project has comprehensive test coverage for both backend and frontend components.

### Backend Testing

The Python backend uses pytest for testing. Tests are organized into:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions between components

The backend test suite includes:
- Bot initialization and configuration
- Pipeline setup and component connections
- Text processing and transformation
- Session timeout handling
- Event handling

To write new Python tests, add them to the appropriate directory under `tests/`.

### Frontend Testing

The JavaScript frontend uses Jest for testing. Tests are organized by component:

- **Unit Tests**: Test individual JS modules
- **UI Tests**: Test DOM interactions and UI updates

The frontend test suite includes:
- Configuration validation
- UI state management
- Audio processing
- WebSocket communication
- Event handling

To write new JavaScript tests, add them to the `js/__tests__/` directory.
