#!/bin/bash

# Script to check for missing Calendly events
echo "===== Calendly Events Finder ====="
echo "This script helps find missing Calendly events"
echo ""

# Check if we have a Calendly API key in the environment
if [ -z "$CALENDLY_API_KEY" ]; then
  echo "Error: CALENDLY_API_KEY environment variable not set."
  echo "Please set your Calendly API key first."
  exit 1
fi

# Set date range for the last 12 months (adjust as needed)
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_DATE=$(date -u -d "12 months ago" +"%Y-%m-%dT%H:%M:%SZ")

echo "Date range: $START_DATE to $END_DATE"
echo ""

# Get user information
echo "Getting user information..."
USER_RESULT=$(curl -s -H "Authorization: Bearer $CALENDLY_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.calendly.com/users/me")

# Check if the API call was successful
if echo "$USER_RESULT" | grep -q "error"; then
  echo "Error connecting to Calendly API:"
  echo "$USER_RESULT"
  exit 1
fi

# Extract user info
USER_NAME=$(echo "$USER_RESULT" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
USER_EMAIL=$(echo "$USER_RESULT" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
ORGANIZATION_URI=$(echo "$USER_RESULT" | grep -o '"current_organization":"[^"]*"' | cut -d'"' -f4)

echo "Authenticated as: $USER_NAME ($USER_EMAIL)"
echo "Organization: $ORGANIZATION_URI"
echo ""

# Count events in Calendly for the given time period
echo "Counting events in Calendly..."
COUNT_RESULT=$(curl -s -H "Authorization: Bearer $CALENDLY_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.calendly.com/scheduled_events/count?min_start_time=$START_DATE&max_start_time=$END_DATE&status=active")

# Extract event count
CALENDLY_COUNT=$(echo "$COUNT_RESULT" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ -z "$CALENDLY_COUNT" ]; then
  echo "Error getting count from Calendly API:"
  echo "$COUNT_RESULT"
  exit 1
fi

echo "Found $CALENDLY_COUNT events in Calendly"
echo ""

# Count events in our database
echo "Counting events in database..."
DB_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL;")
DB_COUNT=$(echo "$DB_COUNT" | tr -d ' ')

echo "Found $DB_COUNT events in our database"
echo ""

# Calculate missing events
MISSING=$((CALENDLY_COUNT - DB_COUNT))

if [ $MISSING -gt 0 ]; then
  echo "Found $MISSING missing events!"
  echo ""
  
  # Get events from Calendly
  echo "Fetching events from Calendly to find missing ones..."
  echo "This may take some time for a large number of events..."
  
  # Create a temporary file to store Calendly events
  TEMP_FILE="calendly_events.json"
  
  # Fetch the first page of events
  curl -s -H "Authorization: Bearer $CALENDLY_API_KEY" \
    -H "Content-Type: application/json" \
    "https://api.calendly.com/scheduled_events?count=100&min_start_time=$START_DATE&max_start_time=$END_DATE&status=active" > "$TEMP_FILE"
  
  # Display some sample missing events
  echo "Sample of events that might be missing (first page only):"
  echo "------------------------------------------------------"
  
  # Parse and print event details
  jq -r '.collection[] | "Event: \(.name) - \(.start_time) - ID: \(.uri)"' "$TEMP_FILE" | head -10
  
  echo ""
  echo "------------------------------------------------------"
  echo "To see all missing events, you'll need to:"
  echo "1. Fetch all pages from the Calendly API"
  echo "2. Compare with events in the database"
  echo ""
  echo "Curl command to get invitees for a sample event:"
  SAMPLE_EVENT_ID=$(jq -r '.collection[0].uri' "$TEMP_FILE" | awk -F/ '{print $NF}')
  echo "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/scheduled_events/$SAMPLE_EVENT_ID/invitees\""
  
  # Clean up
  rm -f "$TEMP_FILE"
else
  echo "No missing events found! Our database has all Calendly events."
fi

echo ""
echo "===== Script Complete ====="