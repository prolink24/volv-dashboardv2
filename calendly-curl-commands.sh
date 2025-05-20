#!/bin/bash

# Calendly Event Finder - Finds all events including those missing from database
# Usage: ./calendly-curl-commands.sh

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== Calendly Event Finder ===========${NC}"
echo -e "${BLUE}This script will help find all Calendly events, including those missing from your database${NC}"

# Organization URI 
ORG_URI="https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508"

# Date ranges to check (to catch historical data)
CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SIX_MONTHS_AGO=$(date -u -d "6 months ago" +"%Y-%m-%dT%H:%M:%SZ")
ONE_YEAR_AGO=$(date -u -d "12 months ago" +"%Y-%m-%dT%H:%M:%SZ")
TWO_YEARS_AGO=$(date -u -d "24 months ago" +"%Y-%m-%dT%H:%M:%SZ")

echo -e "\n${YELLOW}=== Date Ranges to Check ===${NC}"
echo -e "Current Date: $CURRENT_DATE"
echo -e "6 Months Ago: $SIX_MONTHS_AGO"
echo -e "1 Year Ago: $ONE_YEAR_AGO"
echo -e "2 Years Ago: $TWO_YEARS_AGO"

echo -e "\n${YELLOW}=== Commands to Fetch Events by Date Range ===${NC}"

# Command 1: Recent events (last 6 months)
echo -e "\n${GREEN}1. Recent Events (Last 6 Months)${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/scheduled_events?organization=$ORG_URI&count=100&status=active,canceled&min_start_time=$SIX_MONTHS_AGO&max_start_time=$CURRENT_DATE\""

# Command 2: Events from previous 6 months (6-12 months ago)
echo -e "\n${GREEN}2. Events from 6-12 Months Ago${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/scheduled_events?organization=$ORG_URI&count=100&status=active,canceled&min_start_time=$ONE_YEAR_AGO&max_start_time=$SIX_MONTHS_AGO\""

# Command 3: Older events (1-2 years ago)
echo -e "\n${GREEN}3. Older Events (1-2 Years Ago)${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/scheduled_events?organization=$ORG_URI&count=100&status=active,canceled&min_start_time=$TWO_YEARS_AGO&max_start_time=$ONE_YEAR_AGO\""

echo -e "\n${YELLOW}=== Commands to Fetch Pagination Links ===${NC}"
echo -e "${CYAN}If you receive a 'next_page' value in the response, run this command with the URL:${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"NEXT_PAGE_URL\""

echo -e "\n${YELLOW}=== Commands to Query Specific Event Types ===${NC}"
echo -e "${GREEN}List Available Event Types${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/event_types?organization=$ORG_URI\""

echo -e "\n${YELLOW}=== Commands to Get Event Invitees ===${NC}"
echo -e "${CYAN}Replace EVENT_UUID with the event ID from the previous query results:${NC}"
echo -e "curl -H \"Authorization: Bearer \$CALENDLY_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  \"https://api.calendly.com/scheduled_events/EVENT_UUID/invitees\""

echo -e "\n${YELLOW}=== Database Validation ===${NC}"
echo -e "${CYAN}Count Calendly events in your database:${NC}"
echo -e "SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL;"

echo -e "${CYAN}Sample of Calendly events in your database:${NC}"
echo -e "SELECT id, title, assigned_to, calendly_event_id, start_time, end_time, status 
FROM meetings 
WHERE calendly_event_id IS NOT NULL 
ORDER BY start_time DESC LIMIT 10;"

echo -e "\n${RED}===== Finding Missing Events Process =====${NC}"
echo -e "1. Run the curl commands above for each date range"
echo -e "2. Save the output to a file (e.g., calendly_events.json)"
echo -e "3. Extract the event IDs from the response:"
echo -e "   ${CYAN}cat calendly_events.json | grep -o '\"uri\":\"[^\"]*\"' | cut -d'/' -f5 | sort > calendly_events_ids.txt${NC}"
echo -e "4. Extract event IDs from your database:"
echo -e "   ${CYAN}psql \$DATABASE_URL -c \"COPY (SELECT calendly_event_id FROM meetings WHERE calendly_event_id IS NOT NULL) TO STDOUT;\" > database_events_ids.txt${NC}"
echo -e "5. Find events that are in Calendly but not in your database:"
echo -e "   ${CYAN}comm -23 calendly_events_ids.txt database_events_ids.txt > missing_events.txt${NC}"

echo -e "\n${BLUE}========== End of Calendly Event Finder ===========${NC}"