#!/usr/bin/env bats

load 'test_helpers'

package_lock_file="$(dirname "$BATS_TEST_DIRNAME")/app-workflows/fixtures/package-lock.json"

@test "deploy to dev environment" {
  run ./.github/workflows/scripts/app-workflows/get-version.sh dev false "" 1234567890ABCDEF "$package_lock_file"
  test_value 0 "$status"
  test_value "get-version.sh -> outputs -> version: v10.0.1-dev-1234567890" "${lines[0]}"
  test_value "v10.0.1-dev-1234567890" "${lines[1]}"
}

@test "deploy to prod environment triggered by release and version matches" {
  # only use version from package-lock.json if it matches the release tag
  run ./.github/workflows/scripts/app-workflows/get-version.sh prod true v10.0.1 1234567890ABCDEF "$package_lock_file"
  test_value 0 "$status"
  test_value "get-version.sh -> outputs -> version: v10.0.1" "${lines[0]}"
  test_value "v10.0.1" "${lines[1]}"
}

@test "deploy to prod environment triggered by release and version doesn't matches" {
  # fail because version in package-lock.json doesn't match the release tag
  run ./.github/workflows/scripts/app-workflows/get-version.sh prod true v9.2.0 1234567890ABCDEF "$package_lock_file"
  test_value 1 "$status"
  test_value "Version in package-lock.json (v10.0.1) does not match the release tag (v9.2.0)" "${lines[0]}"
}

@test "deploy to prod environment triggered by dispatch" {
  # always uses version from package-lock.json when triggered by a dispatch
  run ./.github/workflows/scripts/app-workflows/get-version.sh prod false v9.2.0 1234567890ABCDEF "$package_lock_file"
  test_value 0 "$status"
  test_value "get-version.sh -> outputs -> version: v10.0.1" "${lines[0]}"
  test_value "v10.0.1" "${lines[1]}"
}

@test "invalid deploy environment" {
  run ./.github/workflows/scripts/app-workflows/get-version.sh BAD_ENV false v9.2.0 1234567890ABCDEF "$package_lock_file"
  test_value 1 "$status"
  test_value "Invalid deploy environment: BAD_ENV. Must be 'dev' or 'prod'" "${lines[0]}"
}
