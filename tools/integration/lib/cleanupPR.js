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
 * @typedef {Object} Options
 * @property {string} title - The title to search for.
 * @property {string} repoOwner - The owner of the repository.
 * @property {string} repoName - The name of the repository.
 */

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
 * @param {Options} options - The options for cleanup.
 * @param {string} dateSince - The ISO date string to filter PRs created before this date.
 * @returns {Promise<{prNumber: number, prTitle: string}[]>} The list of matching pull requests.
 */
const findPullRequests = async (octokit, options, dateSince) => {
  const { title: givenTitle, repoOwner, repoName } = options
  /** @type {{prNumber: number, prTitle: string}[]} */
  const result = []
  try {
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner: repoOwner,
      repo: repoName,
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
    console.error(`Failed to fetch pull requests for repo ${repoOwner}/${repoName}: ${errorMessage}`)
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
 * @param {Options} options - The options for cleanup.
 * @param {number} prNumber - The pull request number.
 * @returns {Promise<void>}
 * @throws {Error} If the pull request cannot be closed.
 */
const closePullRequest = async (octokit, options, prNumber) => {
  const { repoOwner, repoName } = options
  try {
    await octokit.pulls.update({
      owner: repoOwner,
      repo: repoName,
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
 * @param {Object} opts - The options for cleanup.
 * @param {string} [opts.title=TARGET_TITLE] - The title to search for.
 * @param {string} [opts.repoOwner=REPO_OWNER] - The owner of the repository.
 * @param {string} [opts.repoName=REPO_NAME] - The name of the repository.
 * @param {string} [dateSince=oneDayAgo] - The ISO date string to filter PRs created before this date.
 * @returns {Promise<void>}
 */
const cleanupPR = async (opts = {}, dateSince = oneDayAgo) => {
  const { title = TARGET_TITLE, repoOwner = REPO_OWNER, repoName = REPO_NAME } = opts
  const options = { title, repoOwner, repoName }
  console.info(`Cleanup options: ${JSON.stringify(options)}`)
  console.info(`Searching for PRs with title: ${title}`)

  const octokit = await createOctokit()
  const found = await findPullRequests(octokit, options, dateSince)
  console.info(`Found ${found.length} PRs with title: ${title} before ${dateSince}`)

  for (const { prTitle, prNumber } of found) {
    console.debug(`Found PR #${prNumber} with title: ${prTitle}`)
    await closePullRequest(octokit, options, prNumber)
  }
}

module.exports = { cleanupPR }
