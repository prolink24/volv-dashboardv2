#!/bin/bash

# Determine the test mode based on the argument
mode=$1

# Check if the server is already running
if ! nc -z localhost 5000 > /dev/null 2>&1; then
  # Start the server in the background
  echo "Starting the application server..."
  npm run dev &
  server_pid=$!

  # Give the server time to start
  echo "Waiting for server to start..."
  sleep 5
  
  # Flag that we started the server
  started_server=true
else
  echo "Server is already running on port 5000, using existing server..."
  started_server=false
fi

# Run the appropriate test command based on the mode
case $mode in
  "headed")
    echo "Running tests in headed mode..."
    npx playwright test --headed
    ;;
  "ui")
    echo "Running tests with UI mode..."
    npx playwright test --ui
    ;;
  "debug")
    echo "Running tests in debug mode..."
    npx playwright test --debug
    ;;
  "file")
    # Run a specific test file
    if [ -z "$2" ]; then
      echo "Error: Please specify a test file to run"
      exit 1
    fi
    echo "Running specific test file: $2..."
    npx playwright test "$2"
    ;;
  *)
    echo "Running tests in headless mode..."
    npx playwright test
    ;;
esac

# Capture the test exit code
test_exit_code=$?

# Shutdown the server if we started it
if [ "$started_server" = true ]; then
  echo "Shutting down the server..."
  kill $server_pid
  wait $server_pid 2>/dev/null
else
  echo "Leaving existing server running..."
fi

# Exit with the test exit code
echo "Tests completed with exit code: $test_exit_code"
exit $test_exit_code