// (c) Copyright 2025, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

/** @type {string | undefined} */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

/** @type {string} */
const REPO_OWNER = 'clearlydefined'

/** @type {string} */
const REPO_NAME = 'curated-data-dev'

/** @type {string} */
const TARGET_TITLE = 'test maven/mavencentral/org.apache.httpcomponents/httpcore/4.4.16'

/** @type {string} */
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

/**
 * Creates an authenticated Octokit instance.
 * @returns {Promise<import('@octokit/rest').Octokit>}
 * @throws {Error} If GITHUB_TOKEN is not set.
 */
const createOctokit = () =>
  import('@octokit/rest').then(({ Octokit }) => {
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set')
    }
    return new Octokit({
      auth: GITHUB_TOKEN
    })
  })

/**
 * Finds pull requests matching the given title and created before the specified date.
 * @param {import('@octokit/rest').Octokit} octokit - The Octokit instance.
 * @param {string} givenTitle - The title to search for.
 * @param {string} dateSince - The ISO date string to filter PRs created before this date.
 * @returns {Promise<{prNumber: number, prTitle: string}[]>} The list of matching pull requests.
 */
const findPullRequests = async (octokit, givenTitle, dateSince) => {
  /** @type {{prNumber: number, prTitle: string}[]} */
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to fetch pull requests for repo ${REPO_OWNER}/${REPO_NAME}: ${errorMessage}`)
    throw error
  }
}

/**
 * Filters pull requests by title.
 * @param {{number: number, title: string}[]} openPrs - The list of open pull requests.
 * @param {string} givenTitle - The title to search for.
 * @returns {{prNumber: number, prTitle: string}[]} The list of matching pull requests.
 */
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

/**
 * Checks if the iteration is done based on the date of the earliest PR.
 * @param {{created_at: string}[]} prsByDateDesc - The list of PRs sorted by date in descending order.
 * @param {string} dateSince - The ISO date string to compare against.
 * @returns {boolean} True if the iteration is done, false otherwise.
 */
const checkIsDone = (prsByDateDesc, dateSince) => {
  if (!prsByDateDesc.length) return true
  const earliestPr = prsByDateDesc[prsByDateDesc.length - 1]
  console.debug(`${earliestPr.created_at} < ${dateSince} ?`)
  return earliestPr.created_at < dateSince
}

/**
 * Closes a pull request.
 * @param {import('@octokit/rest').Octokit} octokit - The Octokit instance.
 * @param {number} prNumber - The pull request number.
 * @returns {Promise<void>}
 * @throws {Error} If the pull request cannot be closed.
 */
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to close PR #${prNumber}: ${errorMessage}`)
    throw error
  }
}

/**
 * Cleans up pull requests with the specified title created before the given date.
 * @param {string} [dateSince=oneDayAgo] - The ISO date string to filter PRs created before this date.
 * @returns {Promise<void>}
 */
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
