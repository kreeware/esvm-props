import { MavenManifest } from './maven_manifest'

const manifests = new Map()

function stripspace(string) {
  return string.replace(/\s+/g, '')
}

export async function getLatestSnapshot(version, type) {
  const extension = type === 'tar' ? 'tar.gz' : 'zip'
  const key = `${version}/${type}`

  if (!manifests.has(key)) {
    manifests.set(key, new MavenManifest(stripspace(`
      https://oss.sonatype.org
      /content/repositories/snapshots
      /org/elasticsearch/distribution/${type}
      /elasticsearch/${version}-SNAPSHOT/maven-metadata.xml
    `)))
  }

  const manifest = await manifests.get(key).fetch()
  const { versioning: { snapshot } } = manifest
  return stripspace(`
    https://oss.sonatype.org
    /content/repositories/snapshots
    /org/elasticsearch/distribution/${type}
    /elasticsearch/${version}-SNAPSHOT/
    elasticsearch-${version}-${snapshot.timestamp}-${snapshot.buildNumber}.${extension}
  `)
}
