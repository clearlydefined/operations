// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
// TODO: remove this once fetch is available in Node
const retry = require('async-retry')

function buildPostOpts(json) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json)
  }
}

async function callFetch(url, fetchOpts) {
  const response = await fetchResponse(url, fetchOpts)
  return verifyResponse(response)
}

async function fetchResponse(url, fetchOpts = {}) {
  console.log(`Calling fetch. URL: ${url}, Options: ${JSON.stringify(fetchOpts)}`)
  return await fetch(url, fetchOpts)
}

function verifyResponse(response) {
  if (!response.ok) {
    const { url, status, statusText } = response
    throw new Error(`Error fetching ${url}: ${status}, ${statusText}`)
  }
  return response
}

async function withRetry(retrier, opts = {}) {
  const defaultOpts = {
    onRetry: (err, iAttempt) => {
      console.log(`Retry ${iAttempt} failed: ${err}`)
    }
  }
  return await retry((bail, iAttempt) => retrier(bail, iAttempt), { ...defaultOpts, ...opts })
}

async function fetchWithRetry(fetcher, retryOpts) {
  const response = await withRetry(async () => {
    const resp = await fetcher()
    if (resp?.status >= 500 || resp?.status === 429) verifyResponse(resp)
    return resp
  }, retryOpts)
  return verifyResponse(response)
}

function createFetcherWithRetry({ maxRetries }) {
  return (url, fetchOpts) => fetchWithRetry(() => fetchResponse(url, fetchOpts), { retries: maxRetries })
}

module.exports = { callFetch, buildPostOpts, createFetcherWithRetry, fetchWithRetry }
