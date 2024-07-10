#!/bin/bash

# Inputs
#   $1 - deploy_env: environment to deploy (i.e. dev | prod) - used as a label for the Docker image
#   $2 - is_release: true if the deployment is triggered by a release, false otherwise
#   $3 - release_tag: the tag of the release that triggered the deployment (empty if not a release)
#   $4 - sha: the git sha of the commit being deployed
#   $5 - lock_file: the path to the package-lock.json file (default: /package-lock.json)
#
# Outputs
#   version: the version of the package to deploy (e.g. v1.2.0, v1.2.0-dev-1234567890)

ROOT_DIR=$(git rev-parse --show-toplevel)

deploy_env="$1"
is_release="$2"
release_tag="$3"
sha="$4"
lock_file="${5:-$ROOT_DIR/package-lock.json}"

version='v'$(jq -r '.version' $lock_file) # e.g. v1.2.0
if [[ "$deploy_env" == 'prod' ]]; then
  if [[ "$is_release" == 'true' ]]; then
    # validate the version when triggered by a release
    if [[ "$version" != "$release_tag" ]]; then
      echo "Version in package-lock.json ($version) does not match the release tag ($release_tag)"
      exit 1
    fi
  fi
elif [[ "$deploy_env" == 'dev' ]]; then
  short_sha=$(echo "$sha" | cut -c 1-10)
  version=$version'-dev-'$short_sha       # e.g. v1.2.0-dev-1234567890
else
  echo "Invalid deploy environment: $deploy_env. Must be 'dev' or 'prod'"
  exit 1
fi

echo "get-version.sh -> outputs -> version: $version"
echo "$version"
