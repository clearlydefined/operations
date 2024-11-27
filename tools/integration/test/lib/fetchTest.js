const { fetchWithRetry } = require('../../lib/fetch')
const assert = require('assert')
const sinon = require('sinon')
const RETRIES = 2

describe('Test retry fetch', function () {
  it('should try fetching data', async function () {
    const fetcher = sinon.stub().resolves(new Response('Hello, world!'))
    const { content } = await test(fetcher)
    assert.strictEqual(content, 'Hello, world!')
    assert.strictEqual(fetcher.callCount, 1)
  })

  it('should try fetching data with retry on exception', async function () {
    const fetcher = sinon
      .stub()
      .onFirstCall()
      .throws(new Error('Connection error'))
      .onSecondCall()
      .resolves(new Response('Hello, world!'))
    const { content } = await test(fetcher)
    assert.strictEqual(content, 'Hello, world!')
    assert.strictEqual(fetcher.callCount, 2)
  })

  it('should try fetching data with retry on server error', async function () {
    const fetcher = sinon
      .stub()
      .onFirstCall()
      .resolves(
        new Response('', {
          status: 502,
          statusText: 'Bad Gateway'
        })
      )
      .onSecondCall()
      .resolves(new Response('Hello, world!'))
    const { content } = await test(fetcher)
    assert.strictEqual(content, 'Hello, world!')
    assert.strictEqual(fetcher.callCount, 2)
  })

  it('should not retry on client error', async function () {
    const fetcher = sinon.stub().resolves(
      new Response('', {
        status: 400,
        statusText: 'Bad Request'
      })
    )
    const { errorMessage } = await test(fetcher)
    assert.ok(errorMessage.includes('Bad Request'))
    assert.strictEqual(fetcher.callCount, 1)
  })

  it('should retry until max times', async function () {
    const fetcher = sinon.stub().rejects(new Error('Connection error'))
    const { errorMessage } = await test(fetcher)
    assert.ok(errorMessage.includes('Connection error'))
    assert.strictEqual(fetcher.callCount, RETRIES + 1)
  })

  it('should retry until max times with server errors', async function () {
    const fetcher = sinon.stub().resolves(
      new Response('', {
        status: 502,
        statusText: 'Bad Gateway'
      })
    )
    const { errorMessage } = await test(fetcher)
    assert.ok(errorMessage.includes('Bad Gateway'))
    assert.strictEqual(fetcher.callCount, RETRIES + 1)
  })
})

async function test(fetcher) {
  let content = '',
    errorMessage = ''
  const retryOpts = { minTimeout: 10, retry: RETRIES }
  try {
    const resp = await fetchWithRetry(fetcher, retryOpts)
    content = await resp.text()
  } catch (err) {
    errorMessage = err.message
  }
  return { content, errorMessage }
}
