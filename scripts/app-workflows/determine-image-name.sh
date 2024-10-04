#!/bin/bash

# Inputs
#   $1 - prefix: the registry prefix (e.g. ghcr.io or dockerhub user)
#   $2 - repo: the orgname/reponame where the image will be published (e.g. 'clearlydefined/service')
#   $3 - deploy_env: environment to deploy (i.e. dev | prod) - used as a label for the Docker image
#   $4 - image-tag: the tag to use for the image (e.g. prod: v1.2.0, dev: v1.2.0+dev:1D3F567890)
#
# Outputs
#   image_name_with_tag: the full image name with tag (e.g. ghcr.io/clearlydefined/service:v1.2.0)

prefix="$1"
repo="$2"
deploy_env="$3"
image_tag="$4"

image_base_name="$repo"

# if gchr we need to include the path to GH repo
if [[ "$prefix" == 'ghcr.io' ]]; then
  image_base_name="$prefix/$repo" # e.g. ghcr.io/clearlydefined/service
fi

if [[ "$prefix" != 'ghcr.io' ]]; then
  reponame="${repo#*/}"
  image_base_name="$prefix/$reponame" # e.g. <dockerhubuser>/service
fi

if [[ "$deploy_env" == 'prod' ]] ; then
    image_name_with_tag="$image_base_name:$image_tag"
elif [[ "$deploy_env" == 'dev' ]] ; then
    image_name_with_tag="$image_base_name-dev:$image_tag"
else
    echo "ERROR: Invalid deploy environment: $deploy_env. Must be 'dev' or 'prod'"
    exit 1
fi

echo "determine_image_name -> outputs -> image_name_with_tag: $image_name_with_tag"
echo "$image_name_with_tag"
