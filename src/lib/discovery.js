import { keys } from 'lodash'
import debugFactory from 'debug'
import { delay } from 'bluebird'
import { resolve } from 'path'

import * as branches from '../lib/branches'
import { getAll } from '../lib/github'
import { tagToBuild } from '../lib/releases'
import { downloadAll } from '../lib/cache'

const debug = debugFactory('esvm-props:discovery')
const BRANCH_CACHE = process.env.BRANCH_CACHE_DIR
if (!BRANCH_CACHE) {
  throw new Error('You must specify the $BRANCH_CACHE_DIR environment variable')
}

let builds
let activeUpdate

async function _startNewUpdate_() {
  debug('fetching updated build info')

  builds = { branches: {}, releases: {} }

  for (const { name } of await getAll('tags')) {
    const [tag, build] = tagToBuild(name)
    if (tag) builds.releases[tag] = build
  }

  builds.branches = await branches.getBranches()
  await downloadAll(BRANCH_CACHE, builds)
  keys(builds.branches).forEach(branch => {
    keys(builds.branches[branch]).forEach(format => {
      builds.branches[branch][format] = `https://esvm-props.kibana.rocks/download?branch=${branch}&format=${format}`
    })
  })
}

export async function updateBuilds() {
  // use the active update
  if (activeUpdate) {
    await activeUpdate
  } else {
    activeUpdate = _startNewUpdate_()
    await activeUpdate
    activeUpdate = null
  }
}

export async function getBuilds() {
  if (activeUpdate) await activeUpdate
  return builds
}

export function getCacheDir(ref, format) {
  return resolve(BRANCH_CACHE, ref, format)
}

export async function setupAutoDiscovery(interval = 30000) {
  await updateBuilds()

  while (true) { // eslint-disable-line no-constant-condition
    if (await branches.shouldUpdate()) {
      debug('fetching auto update')
      await updateBuilds()
    } else {
      debug('not ready for an update')
    }

    await delay(interval)
  }
}
