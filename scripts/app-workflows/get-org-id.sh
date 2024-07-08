#!/bin/bash

# Inputs
#   $1 - org_name: the orgname of the repo (e.g. 'clearlydefined/service' has owner 'clearlydefined')
#
# Outputs
#   org_id: the id of the organization that owns the repo

org_name="$1"

org_info=$(curl -s -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/$org_name")
org_id=$(echo "$org_info" | jq .id)
if [[ "$org_id" == "null" ]]; then
  echo "Organization not found: $org_name"
  exit 1
fi

echo "get-org-id -> outputs -> org_id: $org_id"
echo $org_id
