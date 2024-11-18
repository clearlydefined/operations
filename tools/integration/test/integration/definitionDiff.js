const fs = require('fs').promises
const path = require('path')
const { callFetch } = require('../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, getComponents } = require('./testConfig')
const { compareDocuments } = require('../../lib/compareDefinitions')

async function main() {
  const baseFolderPath = process.argv[2]
  if (!baseFolderPath) {
    console.error('Error: Base folder path is required as an argument.')
    process.exit(1)
  }

  try {
    const components = await getComponents()
    console.info(`Testing definitions for ${JSON.stringify(components)}`)
    await Promise.all(components.map(coordinates => fetchAndCompareDefinition(coordinates, baseFolderPath)))
  } catch (error) {
    console.error('Error:', error)
  }
}

async function fetchAndCompareDefinition(coordinates, baseFolderPath) {
  const [recomputedDef, expectedDef] = await Promise.all([
    getDefinition(devApiBaseUrl, coordinates, true),
    getDefinition(prodApiBaseUrl, coordinates)
  ])
  const diff = compareDocuments(recomputedDef, expectedDef, [
    '_meta',
    'licensed.score',
    'licensed.toolScore',
    'described.score',
    'described.toolScore'
  ])
  await saveDiffToFile(coordinates, diff, baseFolderPath)
  return diff
}

async function getDefinition(apiBaseUrl, coordinates, reCompute = false) {
  reCompute = apiBaseUrl === devApiBaseUrl && reCompute
  let url = `${apiBaseUrl}/definitions/${coordinates}`
  if (reCompute) url += '?force=true'
  return await callFetch(url).then(r => r.json())
}

async function saveDiffToFile(coordinates, diff, baseFolderPath) {
  const dirPath = path.join(baseFolderPath, coordinates)
  const filePath = path.join(dirPath, 'diff.json')
  await fs.mkdir(dirPath, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(diff, null, 2), 'utf8')
}

// Run the main function
main()
