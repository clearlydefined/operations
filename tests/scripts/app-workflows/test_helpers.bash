#!/bin/bash

test_value() {
  local expected="$1"
  local actual="$2"
  diff <(echo "$actual") <(echo "$expected") || { echo -e "expected: '$expected'\nactual:   '$actual'"; return 1; }
}

load_json_fixture() {
  local fixture_filename="$1"
  fixtures_dir="./tests/scripts/app-workflows/fixtures"
  fixture_fullpath="$fixtures_dir/$fixture_filename"

  run cat "$fixture_fullpath"
  fixture=$output

  # Validate and reformat the fixture as a JSON string
  if echo "$fixture" | jq empty > /dev/null 2>&1; then
    # If valid, reformat the JSON string
    fixture_json=$(echo "$fixture" | jq -c .)
  else
    # Let bad data through for testing
    fixture_json=$fixture
    # exit 1
  fi

  echo "$fixture_json"
}

script_fullpath() {
  local script_filename="$1"
  scripts_dir="./scripts/app-workflows"
  fullpath="$scripts_dir/$script_filename"

  echo "$fullpath"
}
