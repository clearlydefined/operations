#!/usr/bin/env bats

load 'test_helpers'

@test "deploy to dev environment" {
  run ./scripts/app-workflows/determine-image-name.sh test-repo dev
  test_value 0 "$status"
  test_value "determine_image_name -> outputs -> image_name: test-repo-dev" "${lines[0]}"
  test_value test-repo-dev "${lines[1]}"
}

@test "deploy to prod environment" {
  run ./scripts/app-workflows/determine-image-name.sh test-repo prod
  test_value 0 "$status"
  test_value "determine_image_name -> outputs -> image_name: test-repo" "${lines[0]}"
  test_value test-repo "${lines[1]}"
}

@test "invalid deploy environment" {
  run ./scripts/app-workflows/determine-image-name.sh test-repo BAD_ENV
  test_value 1 "$status"
  test_value "ERROR: Invalid deploy environment: BAD_ENV. Must be 'dev' or 'prod'" "${lines[0]}"
}
