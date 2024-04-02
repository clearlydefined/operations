// (c) Copyright ClearlyDefined. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

// Prerequisites:
// 1. Install node-fetch package by running `npm install node-fetch`

// Usage:
// node getPRs.mjs <repository> <tag1> <tag2> <gh-pat-token>

import fetch from 'node-fetch';

const owner = 'clearlydefined';
const repo = process.argv[2]; // Pass the repository name as an argument
const tag1 = process.argv[3]; // Pass the first tag as an argument
const tag2 = process.argv[4]; // Pass the second tag as an argument
const token = process.argv[5]; // Pass the GitHub token as an argument

async function getPRs(owner, repo, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`;
  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'GitHub-Pull-Request-Info'
  };

  const response = await fetch(url, { headers });
  const data = await response.json();

  return data;
}

async function getTagComparison(owner, repo, tag1, tag2, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${tag1}...${tag2}`;
  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'GitHub-Pull-Request-Info'
  };

  const response = await fetch(url, { headers });
  const data = await response.json();

  const shas = data.commits.map(commit => commit.sha);
  console.log("count shas: " + shas.length)
  const basesha = data.base_commit.sha;
  console.log("basesha: " + basesha)
  if (!(basesha === null || typeof basesha === 'undefined')) {
    shas.push(basesha);
  }
  console.log("count shas: " + shas.length)

  return shas;
}

async function getPRDetails() {
  const prs = await getPRs(owner, repo, token);
  const comparison = await getTagComparison(owner, repo, tag1, tag2, token);

  const mergedPRs = prs.filter(pr => pr.merged_at && comparison.includes(pr.merge_commit_sha));

  const prDetails = mergedPRs.map(pr => {
    const prNumber = pr.number;
    const prTitle = pr.title;
    const contributors = pr.user.login;
    return `- ${prTitle} (#${prNumber}) (@${contributors})`;
  });

  console.log(prDetails.join('\n'));
}

getPRDetails();
