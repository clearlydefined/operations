#!/usr/bin/env bats

load 'test_helpers'

@test "get github org id" {
  run ./scripts/app-workflows/get-org-id.sh "github"
  test_value 0 "$status"
  test_value "get-org-id -> outputs -> org_id: 9919" "${lines[0]}"
  test_value "9919" "${lines[1]}"
}

@test "missing org name" {
  run ./scripts/app-workflows/get-org-id.sh ""
  test_value 1 "$status"
  test_value "Organization not found: " "${lines[0]}"
}
