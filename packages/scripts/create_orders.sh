#!/bin/bash

BASE_URL="http://localhost:3000/api/orders"

# Sample inscription contents
CONTENTS=(
  "First test inscription"
  "Hello Bitcoin"
  "Testing Broly"
  "Another inscription"
  "Final test order"
)

# Create 5 orders
for i in {0..4}; do
  curl -X POST $BASE_URL \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": \"${CONTENTS[$i]}\",
      \"rewardAmount\": 0.00$(($i + 1))
    }" \
    | jq .
  
  sleep 1
done