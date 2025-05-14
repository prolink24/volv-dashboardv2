#!/usr/bin/env bash

# Terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server_running() {
  # Check using lsof for port 5000
  if lsof -i:5000 -t &> /dev/null; then
    return 0 # Server is running
  else
    return 1 # Server is not running
  fi
}

# Print header
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}     Contact Attribution Testing Suite${NC}"
echo -e "${BLUE}===============================================${NC}"

# Parse command line arguments
TEST_PATH=""
HEADLESS=""
SERVER_ONLY=false
UI_ONLY=false
API_ONLY=false
VERBOSE=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --server-only) SERVER_ONLY=true; shift ;;
    --ui-only) UI_ONLY=true; shift ;;
    --api-only) API_ONLY=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    --headless) HEADLESS="--headed"; shift ;;
    *) TEST_PATH="$1"; shift ;;
  esac
done

# Check if server is already running
SERVER_WAS_RUNNING=false
if check_server_running; then
  echo -e "${YELLOW}Server already running on port 5000${NC}"
  SERVER_WAS_RUNNING=true
else
  echo -e "${YELLOW}Starting server...${NC}"
  # Start the server in the background
  if [ "$VERBOSE" = true ]; then
    npm run dev &
  else
    npm run dev > /dev/null 2>&1 &
  fi
  SERVER_PID=$!
  
  # Wait for server to start
  echo -n "Waiting for server to start"
  for i in {1..10}; do
    if check_server_running; then
      echo -e "\n${GREEN}Server started successfully${NC}"
      break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 10 ]; then
      echo -e "\n${RED}Server failed to start within 10 seconds${NC}"
      exit 1
    fi
  done
fi

# Exit if only starting the server was requested
if [ "$SERVER_ONLY" = true ]; then
  echo -e "${GREEN}Server is now running. Use Ctrl+C to stop.${NC}"
  # If we started the server, wait for it, otherwise just exit
  if [ "$SERVER_WAS_RUNNING" = false ]; then
    wait $SERVER_PID
  fi
  exit 0
fi

# Run the tests
echo -e "${YELLOW}Running tests...${NC}"

# Set up the test command
TEST_COMMAND="npx playwright test"

# Add specific test path if provided
if [ -n "$TEST_PATH" ]; then
  TEST_COMMAND="$TEST_COMMAND $TEST_PATH"
elif [ "$UI_ONLY" = true ]; then
  # Filter to only include UI tests
  TEST_COMMAND="$TEST_COMMAND tests/dashboard.spec.ts tests/contacts.spec.ts tests/attribution-visualizations.spec.ts tests/kpi-hook.spec.ts"
elif [ "$API_ONLY" = true ]; then
  # Filter to only include API tests
  TEST_COMMAND="$TEST_COMMAND tests/api.spec.ts"
fi

# Add headless flag if specified
if [ -n "$HEADLESS" ]; then
  TEST_COMMAND="$TEST_COMMAND $HEADLESS"
fi

# Run the tests
if [ "$VERBOSE" = true ]; then
  echo -e "${BLUE}Executing: $TEST_COMMAND${NC}"
  eval "$TEST_COMMAND"
else
  eval "$TEST_COMMAND"
fi

TEST_EXIT_CODE=$?

# Print test status
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}Tests completed successfully!${NC}"
else
  echo -e "${RED}Tests failed with exit code $TEST_EXIT_CODE${NC}"
fi

# Cleanup - only stop the server if we started it
if [ "$SERVER_WAS_RUNNING" = false ]; then
  echo -e "${YELLOW}Stopping server...${NC}"
  kill $SERVER_PID
  # Wait to make sure server is stopped
  sleep 2
  if check_server_running; then
    echo -e "${RED}Failed to stop server${NC}"
    echo -e "${YELLOW}Attempting force kill...${NC}"
    kill -9 $SERVER_PID
    sleep 1
  fi
  echo -e "${GREEN}Server stopped${NC}"
fi

# Return the test exit code
exit $TEST_EXIT_CODE