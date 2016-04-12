import { keys } from 'lodash'
import debugFactory from 'debug'
import { delay } from 'bluebird'
import { resolve } from 'path'

import { getBranches, branchManifestStale } from '../lib/branches'
import { getReleases } from '../lib/releases'
import { downloadAll } from '../lib/cache'

const debug = debugFactory('esvm-props:discovery')
const BRANCH_CACHE = process.env.BRANCH_CACHE_DIR
if (!BRANCH_CACHE) {
  throw new Error('You must specify the $BRANCH_CACHE_DIR environment variable')
}

let builds
let activeUpdate

function _runPersistantUpdate_() {
  let attemptCount = 0
  const attempt = async (ok, fail) => {
    if (attemptCount > 30) {
      fail(new Error('Failed to update the build info 30 times.'))
      return
    }

    try {
      debug('attempt %d to fetch updated build info', ++attemptCount)
      const releases = await getReleases()
      const branches = await getBranches()
      await downloadAll(BRANCH_CACHE, branches)
      keys(branches).forEach(branch => {
        keys(branches[branch]).forEach(format => {
          branches[branch][format] = `https://esvm-props.kibana.rocks/download?branch=${branch}&format=${format}`
        })
      })
      ok({ branches, releases })
    } catch (err) {
      debug('%s: FAILED TO UPDATE BUILDS %s', Date(), err.stack) // eslint-disable-line no-console
      setTimeout(() => attempt(ok, fail))
    }
  }

  return new Promise(attempt)
}

export async function updateBuilds() {
  // use the active update
  if (activeUpdate) {
    await activeUpdate
  } else {
    try {
      activeUpdate = _runPersistantUpdate_()
      builds = await activeUpdate
    } finally {
      activeUpdate = null
    }
  }
}

export async function getBuilds() {
  if (!builds) await updateBuilds()
  return builds
}

export function getCacheDir(ref, format) {
  return resolve(BRANCH_CACHE, ref, format)
}

export async function setupAutoDiscovery(interval = 30000) {
  await updateBuilds()

  while (true) { // eslint-disable-line no-constant-condition
    if (await branchManifestStale()) {
      debug('fetching auto update')
      await updateBuilds()
    } else {
      debug('not ready for an update')
    }

    await delay(interval)
  }
}
