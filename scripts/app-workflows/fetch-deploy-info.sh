#!/bin/sh

# Inputs
#   $1 - verification_url: url to the health endpoint that returns json with version and sha

# Check if the correct number of arguments are provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <verification-url> <expected-version> <expected-sha>"
  exit 1
fi
verification_url=$1

response=$(curl -s "$verification_url")

# Check if the curl command was successful
if [ $? -ne 0 ]; then
  echo "Failed to fetch the verification URL: $verification_url"
  exit 1
fi

echo $response
