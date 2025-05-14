#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}  Contact Attribution Platform - Playwright E2E Tests   ${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Check if server is already running by trying to connect to it
if curl -s http://localhost:5000/api/attribution/enhanced-stats > /dev/null; then
  echo -e "${GREEN}Server already running on port 5000${NC}"
  SERVER_RUNNING=true
else
  echo -e "${YELLOW}Starting server for tests...${NC}"
  # Start the server in the background
  npm run dev &
  SERVER_PID=$!
  echo -e "${GREEN}Server started with PID ${SERVER_PID}${NC}"
  SERVER_RUNNING=false
  
  # Wait for server to be ready
  echo -e "${YELLOW}Waiting for server to be ready...${NC}"
  attempts=0
  max_attempts=30
  
  while ! curl -s http://localhost:5000/api/attribution/enhanced-stats > /dev/null; do
    attempts=$((attempts+1))
    if [ $attempts -ge $max_attempts ]; then
      echo -e "${RED}Server failed to start after ${max_attempts} attempts.${NC}"
      if [ "$SERVER_RUNNING" = false ]; then
        echo -e "${YELLOW}Cleaning up server process...${NC}"
        kill $SERVER_PID 2>/dev/null
      fi
      exit 1
    fi
    echo -n "."
    sleep 1
  done
  echo -e "\n${GREEN}Server is ready!${NC}"
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
  echo -e "${YELLOW}Installing Playwright dependencies...${NC}"
  npx playwright install --with-deps firefox chromium
fi

# Run the Playwright tests
echo -e "\n${YELLOW}Running Playwright tests...${NC}"
npx playwright test
PLAYWRIGHT_EXIT_CODE=$?

# Clean up only if we started the server
if [ "$SERVER_RUNNING" = false ]; then
  echo -e "${YELLOW}Cleaning up server process...${NC}"
  kill $SERVER_PID 2>/dev/null
fi

# Print final message
echo -e "${BLUE}=======================================================${NC}"
if [ $PLAYWRIGHT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}🎉 Playwright tests passed! The application is working correctly.${NC}"
else
  echo -e "${RED}❌ Some Playwright tests failed. Please check the test output for details.${NC}"
fi
echo -e "${BLUE}=======================================================${NC}"

exit $PLAYWRIGHT_EXIT_CODE