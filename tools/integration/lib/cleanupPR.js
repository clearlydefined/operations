// (c) Copyright 2025, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = 'clearlydefined'
const REPO_NAME = 'curated-data-dev'

const TARGET_TITLE = 'test maven/mavencentral/org.apache.httpcomponents/httpcore/4.4.16'
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

const createOctokit = () =>
  import('@octokit/rest').then(({ Octokit }) => {
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set')
    }
    return new Octokit({
      auth: GITHUB_TOKEN
    })
  })

const findPullRequests = async (octokit, givenTitle, dateSince) => {
  const result = []
  try {
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'open',
      sort: 'created',
      direction: 'desc'
    })

    for await (const { data: openPrs } of iterator) {
      const foundPrs = findInBatch(openPrs, givenTitle)
      result.push(...foundPrs)
      if (checkIsDone(openPrs, dateSince)) break
    }
    return result
  } catch (error) {
    console.error(`Failed to fetch pull requests for repo ${REPO_OWNER}/${REPO_NAME}: ${error.message}`)
    throw error
  }
}

const findInBatch = (openPrs, givenTitle) => {
  const found = (openPrs || [])
    .map(({ number, title }) => {
      console.debug(`Checking PR #${number}: ${title}`)
      return { prNumber: number, prTitle: title }
    })
    .filter(({ prTitle }) => prTitle === givenTitle)

  console.info(`Found ${found.length} PRs with title: ${givenTitle}`)
  return found
}

const checkIsDone = (prsByDateDesc, dateSince) => {
  if (!prsByDateDesc.length) return true
  const earliestPr = prsByDateDesc[prsByDateDesc.length - 1]
  console.debug(`${earliestPr.created_at} < ${dateSince} ?`)
  return earliestPr.created_at < dateSince
}

// Function to close a pull request
const closePullRequest = async (octokit, prNumber) => {
  try {
    await octokit.pulls.update({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: prNumber,
      state: 'closed'
    })
    console.info(`PR #${prNumber} closed successfully.`)
  } catch (error) {
    console.error(`Failed to close PR #${prNumber}: ${error.message}`)
    throw error
  }
}

const cleanup = async (dateSince = oneDayAgo) => {
  console.info(`Owner: ${REPO_OWNER}, Repo: ${REPO_NAME}`)
  console.info(`Searching for PRs with title: ${TARGET_TITLE}`)

  const octokit = await createOctokit()
  const found = await findPullRequests(octokit, TARGET_TITLE, dateSince)
  console.info(`Found ${found.length} PRs with title: ${TARGET_TITLE} before ${dateSince}`)

  for (const { prTitle, prNumber } of found) {
    console.debug(`Found PR #${prNumber} with title: ${prTitle}`)
    await closePullRequest(octokit, prNumber)
  }
}

cleanup()
  .then(() => console.log('Cleanup completed.'))
  .catch(error => console.error(`Error during cleanup: ${error.message}`))
