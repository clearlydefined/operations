const assert = require('assert')
const { callFetch } = require('../../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, getComponents, definition } = require('../testConfig')

const ORIGIN_EXCLUSIONS = ['go/golang', 'debsrc/debian', 'maven/mavengoogle']
const ORIGIN_REVISIONS_EXCLUSIONS = ['debsrc/debian']
const EXTRA_COMPONENTS = ['maven/mavencentral/org.apache.httpcomponents', 'maven/mavencentral/org.apache.httpcompon']

;(async function validateOriginsApi() {
  const components = await getComponents()

  describe('Validate origins API between dev and prod', function () {
    this.timeout(definition.timeout)

    // Rest interval to avoid overloading the servers
    afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

    components.forEach(component => {
      if (shouldCheckOrigins(component)) {
        it(`checks origins API response for ${component}`, () => fetchAndCompareOrigins(component))
      }
      if (shouldCheckOriginsWithRevisions(component)) {
        it(`checks origins API with revisions response for ${component}`, () =>
          fetchAndCompareOriginsWithRevisions(component))
      }
    })

    EXTRA_COMPONENTS.forEach(component => {
      if (shouldCheckOrigins(component)) {
        it(`checks origins API response for ${component}`, () => fetchAndCompareOrigins(component))
      }
    })
  })
})()

function extractIds(response) {
  return response.map(item => item.id)
}

function assertOriginsMatch(actual, expected) {
  const sortedActualIds = extractIds(actual).sort()
  const sortedExpectedIds = extractIds(expected).sort()

  assert.deepStrictEqual(sortedActualIds, sortedExpectedIds)
}

function isNotInExclusionList(list, coordinate) {
  return !list.some(excluded => coordinate.includes(excluded))
}

function shouldCheckOrigins(coordinate) {
  return isNotInExclusionList(ORIGIN_EXCLUSIONS, coordinate)
}

function shouldCheckOriginsWithRevisions(coordinate) {
  return isNotInExclusionList(ORIGIN_REVISIONS_EXCLUSIONS, coordinate)
}

function resolveProviderType(type, provider) {
  switch (type) {
    case 'git':
      return 'github'
    case 'gem':
      return 'rubygems'
    case 'conda':
      return `conda/${provider}`
    case 'maven':
      return provider === 'mavengoogle' ? provider : type
    default:
      return type
  }
}

function parseCoordinates(coordinates) {
  const [type, provider, namespaceToken, name, version] = coordinates.split('/')
  const namespace = namespaceToken === '-' ? '' : namespaceToken
  return { type, provider, namespace, name, version }
}
function buildCondaURL(coordinates) {
  const { type, provider, name } = parseCoordinates(coordinates)
  return `${type}/${provider}/${name}`
}

function buildOriginUrl(coordinates) {
  const { type, provider, namespace, name } = parseCoordinates(coordinates)
  const resolvedType = resolveProviderType(type, provider)
  return `${resolvedType}${namespace ? `/${namespace}` : ''}${name ? `/${name}` : ''}`
}

async function fetchAndCompareOriginsWithRevisions(coordinates) {
  const originUrl = buildOriginUrl(coordinates)
  const [devResponse, prodResponse] = await Promise.all([
    callFetch(`${devApiBaseUrl}/origins/${originUrl}/revisions`).then(res => res.json()),
    callFetch(`${prodApiBaseUrl}/origins/${originUrl}/revisions`).then(res => res.json())
  ])
  assertOriginsMatch(devResponse, prodResponse)
}

async function fetchAndCompareOrigins(coordinates) {
  const originUrl = coordinates.startsWith('conda/') ? buildCondaURL(coordinates) : buildOriginUrl(coordinates)

  const [devResponse, prodResponse] = await Promise.all([
    callFetch(`${devApiBaseUrl}/origins/${originUrl}`).then(res => res.json()),
    callFetch(`${prodApiBaseUrl}/origins/${originUrl}`).then(res => res.json())
  ])

  assertOriginsMatch(devResponse, prodResponse)
}
