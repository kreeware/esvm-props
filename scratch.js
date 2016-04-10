import HttpAsset from 'http-asset'
import xml2json from 'xml2json'

const masterManifest = new HttpAsset(
  'https://oss.sonatype.org' +
  '/content/repositories/snapshots' +
  '/org/elasticsearch/distribution/tar' +
  '/elasticsearch/5.0.0-SNAPSHOT/maven-metadata.xml'
);

(async () => {
  const manifestTxt = await masterManifest.get()
  const xml = xml2json.toJson(manifestTxt)
  console.log(xml)
}())
