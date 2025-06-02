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

# Run the Python tests
echo -e "${YELLOW}Running Python Tests${NC}"
echo -e "${YELLOW}------------------${NC}"

echo -e "${YELLOW}Running unit tests...${NC}"
pytest tests/unit/ -v

echo -e "\n${YELLOW}Running integration tests...${NC}"
pytest tests/integration/ -v

echo -e "\n${YELLOW}Running text transcription processor tests...${NC}"
pytest tests/unit/test_text_transcription_processor.py -v

echo -e "\n${YELLOW}Running full Python test suite with coverage...${NC}"
pytest --cov=. --cov-report=term --cov-report=html

# Run the JavaScript tests
echo -e "\n\n${YELLOW}Running JavaScript Tests${NC}"
echo -e "${YELLOW}----------------------${NC}"

# Check if npm is installed
if command -v npm &> /dev/null; then
    # Run JavaScript tests
    echo -e "${YELLOW}Running JavaScript tests with Jest...${NC}"
    npm test
    
    # Generate JavaScript coverage report
    echo -e "\n${YELLOW}Running JavaScript tests with coverage...${NC}"
    npm run test:coverage
else
    echo -e "${RED}Error: npm is not installed. Skipping JavaScript tests.${NC}"
    echo -e "To run JavaScript tests, please install Node.js and npm."
fi

echo -e "\n${GREEN}All tests completed!${NC}"
echo -e "Python coverage report has been generated in the 'htmlcov' directory"
echo -e "JavaScript coverage report has been generated in the 'coverage' directory"
echo -e "Open htmlcov/index.html or coverage/lcov-report/index.html in a browser to view the reports"
echo -e "\nTest summary report available in TEST_REPORT.md"