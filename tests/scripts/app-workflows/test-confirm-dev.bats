#!/usr/bin/env bats

load 'test_helpers'

@test "deploy to dev environment" {
  run ./scripts/app-workflows/confirm-dev.sh dev
  test_value 0 "$status"
  test_value "Deploying to dev environment" "${lines[0]}"
  test_value "confirm-dev -> outputs -> is_dev:  true" "${lines[1]}"
  test_value true "${lines[2]}"
}

@test "deploy to prod environment" {
  run ./scripts/app-workflows/confirm-dev.sh prod
  test_value 0 "$status"
  test_value "Deploying to prod or UNKNOWN environment" "${lines[0]}"
  test_value "confirm-dev -> outputs -> is_dev:  false" "${lines[1]}"
  test_value false "${lines[2]}"
}

@test "deploy to anything else defaults to prod environment for tighter restrictions" {
  run ./scripts/app-workflows/confirm-dev.sh UNKNOWN_ENV
  test_value 0 "$status"
  test_value "Deploying to prod or UNKNOWN environment" "${lines[0]}"
  test_value "confirm-dev -> outputs -> is_dev:  false" "${lines[1]}"
  test_value false "${lines[2]}"
}
