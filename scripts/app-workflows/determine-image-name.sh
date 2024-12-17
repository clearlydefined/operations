#!/bin/bash

# Inputs
#   $1 - repo_name: the reponame where the image will be published (e.g. 'service')
#   $2 - deploy_env: environment to deploy (i.e. dev | prod) - used as a label for the Docker image
#
# Outputs
#   image_name: the image name without tags (e.g. service, service-dev)

repo_name="$1"
deploy_env="$2"

image_name=""
if [[ "$deploy_env" == 'prod' ]] ; then
    image_name="$repo_name"
elif [[ "$deploy_env" == 'dev' ]] ; then
    image_name="$repo_name-dev"
else
    echo "ERROR: Invalid deploy environment: $deploy_env. Must be 'dev' or 'prod'"
    exit 1
fi

echo "determine_image_name -> outputs -> image_name: $image_name"
echo "$image_name"
