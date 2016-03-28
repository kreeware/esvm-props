import HttpAsset from 'http-asset'
import xml2json from 'xml2json'
import semver from 'semver'
import debugFactory from 'debug'
import { diffChars } from 'diff'
import chalk from 'chalk'

const debug = debugFactory('esvm-props:MavenManifest')

function diff(from = '', to = '') {
  const { green, red, gray, reset } = chalk

  return reset(
    diffChars(from, to).reduce((all, part) => {
      const { added, removed, value } = part
      if (added) return all + green(value)
      if (removed) return all + red(value)
      return all + gray(value)
    }, '')
  )
}

function indent(text) {
  return text.split('\n').map(l => `    ${l}`).join('\n')
}

export class MavenManifest {
  constructor(url) {
    this.asset = new HttpAsset(url)
  }

  async fetch() {
    const xml = await this.asset.get()
    this.lastFetch = xml
    const manifest = JSON.parse(xml2json.toJson(xml))
    return manifest.metadata
  }

  async isReadyForUpdate() {
    const xml = await this.asset.get()

    if (xml !== this.lastFetch) {
      debug(`manifest updated:\n${indent(diff(this.lastFetch, xml))}`)
      this.lastFetch = xml
      return true
    }

    return false
  }

  async fetchSnapshotVersions() {
    const { versioning: { versions: { version: allSnapshots } } } = await this.fetch()

    const snapshots = allSnapshots
      .filter(s => s !== '3.0.0-SNAPSHOT') // ignore the anomalous 3.0

    const versions = snapshots
      .filter(s => s.match(/-snapshot$/i))
      .map(s => s.replace(/-snapshot$/i, ''))
      .filter(s => semver.valid(s))
      .sort(semver.rcompare)

    if (versions.length !== snapshots.length) {
      debug('not all snapshots could be converted to versions')
      debug(JSON.stringify({ versions, snapshots }, null, '  '))
      throw new Error('not all snapshots could be converted to versions')
    }

    return versions
  }
}
