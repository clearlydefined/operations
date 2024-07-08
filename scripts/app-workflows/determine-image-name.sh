#!/bin/bash

# Inputs
#   $1 - repo: the orgname/reponame where the image will be published (e.g. 'clearlydefined/service')
#   $2 - deploy_env: environment to deploy (i.e. dev | prod) - used as a label for the Docker image
#   $3 - image-tag: the tag to use for the image (e.g. prod: v1.2.0, dev: v1.2.0+dev:1D3F567890)
#
# Outputs
#   image_name_with_tag: the full image name with tag (e.g. ghcr.io/clearlydefined/service:v1.2.0)

repo="$1"
deploy_env="$2"
image_tag="$3"

image_base_name="ghcr.io/$repo" # e.g. ghcr.io/clearlydefined/service
if [[ "$deploy_env" == 'prod' ]] ; then
    image_name_with_tag="$image_base_name:$image_tag"
elif [[ "$deploy_env" == 'dev' ]] ; then
    image_name_with_tag="$image_base_name-dev:$image_tag"
else
    echo "Invalid deploy environment: $deploy_env. Must be 'dev' or 'prod'"
    exit 1
fi

echo "determine_image_name -> outputs -> image_name_with_tag: $image_name_with_tag"
echo "$image_name_with_tag"
