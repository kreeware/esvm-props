import HttpAsset from 'http-asset'
import pp from 'properties-parser'
import { props } from 'bluebird'
import semver from 'semver'

import { MavenManifest } from './maven_manifest'
import { getLatestSnapshot } from './snapshots'

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

export async function shouldUpdate() {
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
      zip: url.replace(/\/tar\//g, '/zip/').replace(/\.tar\.gz$/, '.zip'),
      tarball: url.replace(/\/zip\//g, '/tar/').replace(/\.zip$/, '.tar.gz'),
    }
  }

  const versions = await snapshotManifest.fetchSnapshotVersions()
  let currentMajor = null
  let foundMaster = false

  for (const v of versions) {
    const major = semver.major(v)
    const minor = semver.minor(v)

    if (currentMajor !== major) {
      currentMajor = major
      // this is the edge of this major version
      if (!foundMaster) {
        // this is master
        foundMaster = true
        builds.master = await props({
          zip: getLatestSnapshot(v, 'zip'),
          tarball: getLatestSnapshot(v, 'tar'),
        })
      } else {
        builds[`${major}.x`] = await props({
          zip: getLatestSnapshot(v, 'zip'),
          tarball: getLatestSnapshot(v, 'tar'),
        })
      }
    } else {
      builds[`${major}.${minor}`] = await props({
        zip: getLatestSnapshot(v, 'zip'),
        tarball: getLatestSnapshot(v, 'tar'),
      })
    }
  }

  // sort the build keys before response
  return Object.keys(builds).sort().reverse().reduce((all, version) => ({
    ...all,
    [version]: builds[version],
  }), {})
}
