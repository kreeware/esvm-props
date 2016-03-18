import PromiseRouter from 'express-promise-router'
import { getAll } from '../lib/github'
import { tagToBuild } from '../lib/releases'
import * as branches from '../lib/branches'
import debugFactory from 'debug'

const router = new PromiseRouter()
const debug = debugFactory('esvm-props:fetch')

let builds
let activeUpdate

async function update() {
  if (activeUpdate) {
    // use the active update
    return await activeUpdate
  }

  activeUpdate = (async function _update_() {
    debug('fetching updated build info')

    builds = { branches: {}, releases: {} }

    for (const { name } of await getAll('tags')) {
      const [tag, build] = tagToBuild(name)
      if (tag) builds.releases[tag] = build
    }

    builds.branches = await branches.getBranches()
    activeUpdate = null
  }())

  return await activeUpdate
}

(async function autoCheckForUpdate() {
  if (await branches.shouldUpdate()) {
    debug('fetching auto update')
    await update()
  } else {
    debug('not ready for an update')
  }
  setTimeout(autoCheckForUpdate, 30000)
}())

/* GET home page. */
router.get('/builds', async function getBuildsRoute(req, res) {
  if (activeUpdate) await activeUpdate
  res.json(builds)
})

router.all('/builds/update', async function checkForUpdateRoute(req, res) {
  debug('udpate requested')
  await update()
  res.send('okay')
})

router.get('/ping', (req, res) => res.send('pong'))

module.exports = router
