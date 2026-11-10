#!/usr/bin/env bash
set -euo pipefail

[[ "$GITHUB_REPOSITORY" == 'tron-ai-team/terafes_07' && "$GITHUB_REF" == 'refs/heads/main' ]]
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
repo="repos/$GITHUB_REPOSITORY"
endpoint="$repo/environments/backend-production"

if ! gh api "$repo/branches/main" | jq -e --arg sha "$GITHUB_SHA" '
  .protected == true and .commit.sha == $sha
' >/dev/null; then
  echo 'Release SHA is no longer the current protected main head.' >&2
  exit 1
fi

if ! gh api "$endpoint" | jq -e '
  .can_admins_bypass == false and
  .deployment_branch_policy.custom_branch_policies == true and
  .deployment_branch_policy.protected_branches == false and
  (.protection_rules | type == "array" and all(.[]; .type == "branch_policy"))
' >/dev/null || ! gh api "$endpoint/deployment-branch-policies" | jq -e '
  .total_count == 1 and (.branch_policies | length == 1) and
  .branch_policies[0].type == "branch" and .branch_policies[0].name == "main"
' >/dev/null || ! gh api "$endpoint/deployment_protection_rules" | jq -e '
  .total_count == 0
' >/dev/null; then
  echo 'backend-production must allow only the main branch and have no reviewer, wait, or bypass rule.' >&2
  exit 1
fi
