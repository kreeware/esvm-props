import PromiseRouter from 'express-promise-router'
import debugFactory from 'debug'

import { getBuilds, updateBuilds, getCacheDir } from '../lib/discovery'
import { readQueryParams } from '../lib/route_params'

const debug = debugFactory('esvm-props:fetch')

const router = new PromiseRouter()
export const rootRouter = router

router.get('/builds', async function getBuildsRoute(req, res) {
  res.json(await getBuilds())
})

router.all('/builds/update', async function checkForUpdateRoute(req, res) {
  debug('udpate requested')
  await updateBuilds()
  res.send('okay')
})

router.get('/ping', (req, res) => res.send('pong'))

router.get('/url', async function getUrlFromBuild(req, res) {
  const _builds = await getBuilds()
  const { type, ref, format } = readQueryParams(_builds, req.query)
  res.type('text').send(_builds[type][ref][format])
})

router.get('/download', async function streamBuild(req, res) {
  const _builds = await getBuilds()
  const { type, ref, format } = readQueryParams(_builds, req.query)

  if (type !== 'branches') {
    res.redirect(_builds[type][ref][format])
    return
  }

  const ext = format === 'tarball' ? '.tar.gz' : '.zip'
  res.download(getCacheDir(ref, format), `${ref}${ext}`)
})
