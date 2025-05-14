#!/bin/bash

# Determine the test mode based on the argument
mode=$1

# Start the server in the background
echo "Starting the application server..."
npm run dev &
server_pid=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 5

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
  *)
    echo "Running tests in headless mode..."
    npx playwright test
    ;;
esac

# Capture the test exit code
test_exit_code=$?

# Shutdown the server
echo "Shutting down the server..."
kill $server_pid
wait $server_pid 2>/dev/null

# Exit with the test exit code
echo "Tests completed with exit code: $test_exit_code"
exit $test_exit_code