#!/usr/bin/env bats

load 'test_helpers'

@test "Test bad status" {
  fixture=$(load_json_fixture "validate-status-error.json")
  run ./scripts/app-workflows/validate-deploy.sh $fixture "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Validation failed: status is not OK" "${lines[0]}"
  test_value "Expected: OK, Actual: BAD_STATUS" "${lines[1]}"
}

@test "Test incorrect version" {
  fixture=$(load_json_fixture "validate-version-error.json")
  run ./scripts/app-workflows/validate-deploy.sh $fixture "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Validation failed: version mismatch" "${lines[0]}"
  test_value "Expected: v2.999.0, Actual: v1.0.0-BAD" "${lines[1]}"
}

@test "Test incorrect sha" {
  fixture=$(load_json_fixture "validate-sha-error.json")
  run ./scripts/app-workflows/validate-deploy.sh $fixture "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Validation failed: sha mismatch" "${lines[0]}"
  test_value "Expected: 1234567890ABCDEF, Actual: BAD_SHA" "${lines[1]}"
}

@test "Test valid response" {
  fixture=$(load_json_fixture "validate-good-response.json")
  run ./scripts/app-workflows/validate-deploy.sh $fixture "v2.999.0" "1234567890ABCDEF"
  test_value 0 "$status"
}

@test "Test non-JSON response" {
  fixture=$(load_json_fixture "validate-non-json-response.json")
  run ./scripts/app-workflows/validate-deploy.sh '$fixture' "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Error: Invalid JSON string" "${lines[0]}"
}

@test "Test invalid JSON response" {
  fixture=$(load_json_fixture "validate-invalid-json-response.json")
  run ./scripts/app-workflows/validate-deploy.sh '$fixture' "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Error: Invalid JSON string" "${lines[0]}"
}

@test "Test empty response" {
  run ./scripts/app-workflows/validate-deploy.sh "" "v2.999.0" "1234567890ABCDEF"
  test_value 1 "$status"
  test_value "Error: Invalid JSON string" "${lines[0]}"
}
