#!/bin/sh

# Inputs
#   $1 - response: valid json that holds status, version, and sha
#   $2 - expected_version: the version that was deployed
#   $3 - expected_sha: the sha of the code being deployed

# Check if the correct number of arguments are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <response> <expected-version> <expected-sha>; $# parameters received, but 3 are expected"
  exit 1
fi

response=$1
expected_version=$2
expected_sha=$3

# Validate and reformat the response as a JSON string.
# This is needed because shell scripts pass parameters
# as simple strings.
if [ -z "$response" ] || ! echo "$response" | jq empty > /dev/null 2>&1; then
  echo "Error: Invalid JSON string"
  exit 1
else
  # If valid, reformat the JSON string
  response_json=$(echo "$response" | jq -c .)
fi

# Parse the JSON response
status=$(echo "$response_json" | jq -r '.status')
version=$(echo "$response_json" | jq -r '.version')
sha=$(echo "$response_json" | jq -r '.sha')

# Validate the response
if [ "$status" != "OK" ]; then
  echo "Validation failed: status is not OK"
  echo "Expected: OK, Actual: $status"
  exit 1
fi

if [ "$version" != "$expected_version" ]; then
  echo "Validation failed: version mismatch"
  echo "Expected: $expected_version, Actual: $version"
  exit 1
fi

if [ "$sha" != "$expected_sha" ]; then
  echo "Validation failed: sha mismatch"
  echo "Expected: $expected_sha, Actual: $sha"
  exit 1
fi

# If all validations pass
echo "Validation successful"
echo "true"
