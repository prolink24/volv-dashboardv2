#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}    Contact Attribution Platform - All Test Suites     ${NC}"
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

# Array to track test results
declare -a TEST_RESULTS
declare -a TEST_NAMES

# Function to run tests with separated output
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "\n${BLUE}------------------------------------------------------${NC}"
  echo -e "${YELLOW}Running ${test_name}...${NC}"
  echo -e "${BLUE}------------------------------------------------------${NC}"
  
  eval $test_command
  local exit_code=$?
  
  TEST_RESULTS+=($exit_code)
  TEST_NAMES+=("$test_name")
  
  return $exit_code
}

# Run the core API tests
run_test "Core API Tests" "npx tsx api-test.ts"

# Run the KPI hook tests
run_test "KPI Configuration Hook Tests" "npx tsx test-kpi-hook.ts"

# Print overall summary
echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${BLUE}                  Test Suite Summary                   ${NC}"
echo -e "${BLUE}=======================================================${NC}"

OVERALL_RESULT=0
PASSED=0
FAILED=0

for i in "${!TEST_RESULTS[@]}"; do
  if [ ${TEST_RESULTS[$i]} -eq 0 ]; then
    echo -e "${GREEN}✓ ${TEST_NAMES[$i]}: PASSED${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${RED}✗ ${TEST_NAMES[$i]}: FAILED${NC}"
    FAILED=$((FAILED+1))
    OVERALL_RESULT=1
  fi
done

echo -e "\n${YELLOW}Summary: ${PASSED} passed, ${FAILED} failed${NC}"

# Clean up only if we started the server
if [ "$SERVER_RUNNING" = false ]; then
  echo -e "${YELLOW}Cleaning up server process...${NC}"
  kill $SERVER_PID 2>/dev/null
fi

echo -e "${BLUE}=======================================================${NC}"
if [ $OVERALL_RESULT -eq 0 ]; then
  echo -e "${GREEN}🎉 All test suites passed! The application is working correctly.${NC}"
else
  echo -e "${RED}❌ Some test suites failed. Please fix the issues before proceeding.${NC}"
fi
echo -e "${BLUE}=======================================================${NC}"

exit $OVERALL_RESULT