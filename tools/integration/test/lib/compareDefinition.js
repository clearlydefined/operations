const assert = require('assert')
const { normalizeLicenseExpression } = require('../../lib/compareDefinitions')

describe('normalizeLicenseExpression', () => {
  it('should treat (MIT OR Apache-2.0) and (Apache-2.0 OR MIT) as equivalent', () => {
    assert.deepStrictEqual(
      normalizeLicenseExpression('(MIT OR Apache-2.0)'),
      normalizeLicenseExpression('(Apache-2.0 OR MIT)')
    )
  })

  it('should treat ( LGPL-2.1-only OR MIT) AND Apache-2.0 and ( MIT OR LGPL-2.1-only) AND Apache-2.0 as equivalent', () => {
    const actual1 = '( LGPL-2.1-only OR MIT) AND Apache-2.0'
    const expected1 = '( MIT OR LGPL-2.1-only) AND Apache-2.0'
    assert.deepStrictEqual(normalizeLicenseExpression(actual1), normalizeLicenseExpression(expected1))
  })

  it('should treat (LGPL-2.1-only OR MIT) AND Apache-2.0 and (LGPL-2.1-only OR MIT) AND Apache-2.0 as equivalent', () => {
    const actual2 = '(LGPL-2.1-only OR MIT) AND Apache-2.0'
    const expected2 = '(LGPL-2.1-only OR MIT) AND Apache-2.0'
    assert.deepStrictEqual(normalizeLicenseExpression(actual2), normalizeLicenseExpression(expected2))
  })

  it('should treat (LGPL-2.1-only OR MIT) OR Apache-2.0 and (MIT OR LGPL-2.1-only) OR Apache-2.0 as equivalent', () => {
    const actual3 = '(LGPL-2.1-only OR MIT) OR Apache-2.0'
    const expected3 = '(MIT OR LGPL-2.1-only) OR Apache-2.0'
    assert.deepStrictEqual(normalizeLicenseExpression(actual3), normalizeLicenseExpression(expected3))
  })

  it('should treat (LGPL-2.1-only OR Apache-2.0) OR MIT and (MIT OR LGPL-2.1-only) OR Apache-2.0 as equivalent', () => {
    const actual4 = '(LGPL-2.1-only OR Apache-2.0) OR MIT'
    const expected4 = '(MIT OR LGPL-2.1-only) OR Apache-2.0'
    assert.deepStrictEqual(normalizeLicenseExpression(actual4), normalizeLicenseExpression(expected4))
  })

  it('should treat ( LGPL-2.1-only OR MIT) AND Apache-2.0 and Apache-2.0 AND ( MIT OR LGPL-2.1-only) as equivalent', () => {
    const actual6 = '( LGPL-2.1-only OR MIT) AND Apache-2.0'
    const expected6 = 'Apache-2.0 AND ( MIT OR LGPL-2.1-only)'
    assert.deepStrictEqual(normalizeLicenseExpression(actual6), normalizeLicenseExpression(expected6))
  })

  it('should NOT treat (LGPL-2.1-only OR Apache-2.0) AND MIT and (MIT OR LGPL-2.1-only) OR Apache-2.0 as equivalent', () => {
    const actual5 = '(LGPL-2.1-only OR Apache-2.0) AND MIT'
    const expected5 = '(MIT OR LGPL-2.1-only) OR Apache-2.0'
    assert.notDeepStrictEqual(normalizeLicenseExpression(actual5), normalizeLicenseExpression(expected5))
  })
})
