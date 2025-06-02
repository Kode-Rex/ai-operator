#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running AI Operator Tests${NC}"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo -e "Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo -e "Installing required packages..."
    pip install -r requirements.txt
fi

# Run the tests
echo -e "${YELLOW}Running unit tests...${NC}"
pytest tests/unit/ -v

echo -e "\n${YELLOW}Running integration tests...${NC}"
pytest tests/integration/ -v

echo -e "\n${YELLOW}Running text transcription processor tests...${NC}"
pytest tests/unit/test_text_transcription_processor.py -v

echo -e "\n${YELLOW}Running full test suite with coverage...${NC}"
pytest --cov=. --cov-report=term --cov-report=html

echo -e "\n${GREEN}Tests completed!${NC}"
echo -e "Coverage report has been generated in the 'htmlcov' directory"
echo -e "Open htmlcov/index.html in a browser to view the report"
echo -e "\nTest summary report available in TEST_REPORT.md"