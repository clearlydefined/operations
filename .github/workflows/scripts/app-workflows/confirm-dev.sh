#!/bin/bash

# Inputs
#   $1 - deploy_env: environment to deploy (i.e. dev | prod) - used as a label for the Docker image
#
# Outputs
#   is-dev: 'true' if deploying to dev environment, 'false' otherwise

deploy_env="$1"

is_dev='false'
if [[ "$deploy_env" == 'dev' ]]; then
  is_dev='true'
  echo "Deploying to dev environment"
else
  echo "Deploying to prod or UNKNOWN environment"
fi

echo "confirm-dev -> outputs -> is_dev:  $is_dev"
echo $is_dev
