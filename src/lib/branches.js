import HttpAsset from 'http-asset'
import pp from 'properties-parser'
import semver from 'semver'
import debugFactory from 'debug'

import { MavenManifest } from './maven_manifest'
import { getLatestSnapshot } from './snapshots'

const debug = debugFactory('esvm-props:branches')

const asset = new HttpAsset('https://raw.githubusercontent.com/elastic/ci/master/client_tests_urls.prop')
const snapshotManifest = new MavenManifest(
  'https://oss.sonatype.org' +
  '/content/repositories/snapshots' +
  '/org/elasticsearch/distribution' +
  '/tar/elasticsearch/maven-metadata.xml'
)

function keyToVersion(key) {
  const name = key.toLowerCase().replace(/^url_/, '')
  if (name === 'master') return name

  const majorMatch = name.match(/^(\d+)x$/)
  if (majorMatch) {
    return `${majorMatch[1]}.x`
  }

  const minorMatch = name.match(/^(\d)(\d+)$/)
  if (minorMatch) {
    return `${minorMatch[1]}.${minorMatch[2]}`
  }

  return null
}

export async function branchManifestStale() {
  return await snapshotManifest.isReadyForUpdate()
}

export async function getBranches() {
  const txt = await asset.get()
  const urls = pp.parse(txt)

  const builds = {}
  for (const key of Object.keys(urls)) {
    const url = urls[key]
    const version = keyToVersion(key)
    if (!version) continue

    builds[version] = {
      zip: {
        time: 0,
        url: url.replace(/\/tar\//g, '/zip/').replace(/\.tar\.gz$/, '.zip'),
      },
      tarball: {
        time: 0,
        url: url.replace(/\/zip\//g, '/tar/').replace(/\.zip$/, '.tar.gz'),
      },
    }
    debug('set base build for %j, %j', version, builds[version])
  }

  const versions = await snapshotManifest.fetchSnapshotVersions()
  let prev = null
  let master = null

  async function setBuildVersion(v, name) {
    const [zip, tarball] = await Promise.all([
      getLatestSnapshot(v, 'zip'),
      getLatestSnapshot(v, 'tar'),
    ])

    const b = builds[name]
    if (!b) {
      debug(`setting ${name} to %j`, { zip, tarball })
      builds[name] = { zip, tarball }
      return
    }

    if (zip.time > b.zip.time) {
      debug(`overriding ${name}.zip to with newer, %j`, zip)
      b.zip = zip
    } else {
      debug(`ignoring older ${name}.zip %j`, zip)
    }

    if (tarball.time > b.tarball.time) {
      debug(`overriding ${name}.tarball to with newer %j`, tarball)
      b.tarball = tarball
    } else {
      debug(`ignoring older ${name}.tarball %j`, tarball)
    }
  }

  for (const v of versions) {
    const major = semver.major(v)
    const minor = semver.minor(v)

    if (!prev || prev.major !== major || (prev.major === major && prev.minor === minor)) {
      // this is the edge of this major version
      if (!master || (master.major === major && master.minor === minor)) {
        // this is master
        master = { major, minor }
        await setBuildVersion(v, 'master')
      } else {
        await setBuildVersion(v, `${major}.x`)
      }
    } else {
      await setBuildVersion(v, `${major}.${minor}`)
    }

    prev = { major, minor }
  }

  // sort the build keys before response
  return Object.keys(builds).sort().reverse().reduce((all, version) => ({
    ...all,
    [version]: {
      zip: builds[version].zip.url,
      tarball: builds[version].tarball.url,
    },
  }), {})
}
