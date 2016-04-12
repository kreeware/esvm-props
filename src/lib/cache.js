import { map, fromCallback as fcb } from 'bluebird'
import { rename, createWriteStream } from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import mkdirp from 'mkdirp-then'
import debugFactory from 'debug'

const debug = debugFactory('esvm-props:cache')

export async function streamToFile(dest, stream) {
  const tempDest = `${dest}.temp`

  await new Promise((resolve, reject) => {
    debug('streaming download to %j', tempDest)
    stream
      .on('error', reject)
      .pipe(createWriteStream(tempDest))
      .on('error', reject)
      .on('finish', resolve)
  })

  debug('download complete, renaming temp download to %j', dest)
  await fcb(cb => rename(tempDest, dest, cb))
}

export async function downloadFormat(dir, branch, format, url) {
  const outDir = path.resolve(dir, branch)
  await mkdirp(outDir)
  const output = path.resolve(outDir, format)

  debug('requesting %j', url)
  const resp = await fetch(url)
  debug('%j', url)
  debug('  => status:        %j %j', resp.status, resp.statusText)
  debug('     last-modified: %j', resp.headers.get('last-modified'))
  debug('     etag:          %j', resp.headers.get('etag'))
  debug()

  if (Math.floor(resp.status / 100) === 2) {
    await streamToFile(output, resp.body)
  } else {
    throw new Error(`Bad response from request for ${branch}/${format} => ${resp.status} :: ${url}`)
  }
}

export async function downloadBranch(dir, branch, urls) {
  const formats = Object.keys(urls)
  await map(formats, format => downloadFormat(dir, branch, format, urls[format]))
}

export async function downloadAll(dir, builds) {
  return map(
    Object.keys(builds.branches),
    branch => downloadBranch(dir, branch, builds.branches[branch])
  )
}
