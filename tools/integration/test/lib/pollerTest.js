// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { strictEqual } = require('assert')
const Poller = require('../../lib/poller')
const sinon = require('sinon')

describe('Unit tests for Poller', function () {
  const interval = 10 * 1
  const maxTime = 10 * 2
  let poller

  beforeEach(function () {
    poller = new Poller(interval, maxTime)
  })

  it('should poll until max time reached', async function () {
    const activity = sinon.stub().resolves(false)
    const result = await poller.with(activity).poll()
    strictEqual(activity.callCount, 2)
    strictEqual(result, false)
  })

  it('should handle when activity is done', async function () {
    const activity = sinon.stub().resolves(true)
    const result = await poller.with(activity).poll()
    strictEqual(activity.callCount, 1)
    strictEqual(result, true)
  })

  it('should continue to poll until activity is done', async function () {
    const activity = sinon.stub().resolves(false).onCall(1).resolves(true)
    const result = await poller.with(activity).poll()
    strictEqual(activity.callCount, 2)
    strictEqual(result, true)
  })

  it('should poll once for one time poller', async function () {
    const activity = sinon.stub().resolves(false)
    const result = await new Poller(1, 1).with(activity).poll()
    strictEqual(activity.callCount, 1)
    strictEqual(result, false)
  })
})
