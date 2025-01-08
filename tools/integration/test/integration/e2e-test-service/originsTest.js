const assert = require('assert')
const { callFetch } = require('../../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, getComponents, definition } = require('../testConfig')

const ORIGIN_EXCLUSION_LIST = ['go/golang', 'debsrc/debian', 'maven/mavengoogle']
const ORIGIN_REVISIONS_EXCLUSION_LIST = ['debsrc/debian']

const MAVEN_COMPONENT_GROUP_ID = 'maven/mavencentral/org.apache.httpcomponents'
const MAVEN_COMPONENT_PARTIAL_GROUP_ID = 'maven/mavencentral/org.apache.httpcompon'
const GRADLE_COMPONENT_ENDPOINT = 'gradleplugin/io.github.lognet.grpc-spring-boot'

;(async function validateOriginsApi() {
  const components = await getComponents()

  describe('Validate Origins API Between Dev and Prod', function () {
    this.timeout(definition.timeout)

    afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

    components.filter(isOriginAllowed).forEach(component => {
      it(`Validates Origins API response for ${component}`, () => compareOrigins(component))
    })

    components.filter(isOriginWithRevisionsAllowed).forEach(component => {
      it(`Validates Origins API response with revisions for ${component}`, () => compareOriginsWithRevisions(component))
    })

    it('Validates Origins API response for a Maven component with only a group ID', () =>
      compareOrigins(MAVEN_COMPONENT_GROUP_ID))

    it('Validates Origins API response for a Maven component with a partial group ID for suggestion checks', () =>
      compareOrigins(MAVEN_COMPONENT_PARTIAL_GROUP_ID))

    it('Validates Origins API response for a Gradle plugin component', () =>
      compareEndpoints(GRADLE_COMPONENT_ENDPOINT))

    it('Validates Origins API with revisions response for a Gradle plugin component', () =>
      compareEndpoints(`${GRADLE_COMPONENT_ENDPOINT}/revisions`))
  })
})()

function extractIds(response) {
  return response.map(item => item.id)
}

function assertResponsesMatch(actual, expected) {
  const sortedActualIds = extractIds(actual).sort()
  const sortedExpectedIds = extractIds(expected).sort()

  assert.deepStrictEqual(sortedActualIds, sortedExpectedIds)
}

function isCoordinateAllowed(coordinate, exclusionList) {
  return !exclusionList.some(excluded => coordinate.includes(excluded))
}

function isOriginAllowed(coordinate) {
  return isCoordinateAllowed(coordinate, ORIGIN_EXCLUSION_LIST)
}

function isOriginWithRevisionsAllowed(coordinate) {
  return isCoordinateAllowed(coordinate, ORIGIN_REVISIONS_EXCLUSION_LIST)
}

function getProviderType(type, provider) {
  switch (type) {
    case 'git':
    case 'gem':
      return provider
    case 'conda':
      return `conda/${provider}`
    case 'maven':
      return provider === 'mavengoogle' ? provider : type
    default:
      return type
  }
}

function parseCoordinates(coordinates) {
  const [type, provider, namespaceOrEmpty, name, version] = coordinates.split('/')
  const namespace = namespaceOrEmpty === '-' ? '' : namespaceOrEmpty
  return { type, provider, namespace, name, version }
}

function buildCondaUrl(coordinates) {
  const { type, provider, name } = parseCoordinates(coordinates)
  return `${type}/${provider}/${name}`
}

function buildOriginUrl(coordinates) {
  const { type, provider, namespace, name } = parseCoordinates(coordinates)
  const resolvedType = getProviderType(type, provider)
  return `${resolvedType}${namespace ? `/${namespace}` : ''}${name ? `/${name}` : ''}`
}

async function compareEndpoints(endpoint) {
  const [devResponse, prodResponse] = await Promise.all([
    callFetch(`${devApiBaseUrl}/origins/${endpoint}`).then(res => res.json()),
    callFetch(`${prodApiBaseUrl}/origins/${endpoint}`).then(res => res.json())
  ])
  assertResponsesMatch(devResponse, prodResponse)
}

async function compareOriginsWithRevisions(coordinates) {
  const originUrl = buildOriginUrl(coordinates)
  await compareEndpoints(`${originUrl}/revisions`)
}

async function compareOrigins(coordinates) {
  const originUrl = coordinates.startsWith('conda/') ? buildCondaUrl(coordinates) : buildOriginUrl(coordinates)
  await compareEndpoints(`${originUrl}`)
}
