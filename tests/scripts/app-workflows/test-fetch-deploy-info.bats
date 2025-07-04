#!/usr/bin/env bats

load 'test_helpers'

@test "Test bogus URL" {
  run ./scripts/app-workflows/fetch-deploy-info.sh "http://localhost/bogus-url"
  test_value 1 "$status"
  test_value "Failed to fetch the verification URL: http://localhost/bogus-url" "${lines[0]}"
}
