#!/bin/bash

test_value() {
  local expected="$1"
  local actual="$2"
  diff <(echo "$actual") <(echo "$expected") || { echo -e "expected: $expected\nactual: '$actual'"; return 1; }
}
