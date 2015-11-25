import HttpAsset from 'http-asset';
import pp from 'properties-parser';

const asset = new HttpAsset('https://raw.githubusercontent.com/elastic/ci/master/client_tests_urls.prop');

function keyToVersion(key) {
  const name = key.toLowerCase().replace(/^url_/, '');
  if (name === 'master') return name;

  const majorMatch = name.match(/^(\d+)x$/);
  if (majorMatch) {
    return `${majorMatch[1]}.x`;
  }

  const minorMatch = name.match(/^(\d)(\d+)$/);
  if (minorMatch) {
    return `${minorMatch[1]}.${minorMatch[2]}`;
  }
}

export async function getBranches() {
  const txt = await asset.get();

  const urls = pp.parse(txt);

  const builds = {};
  for (const key of Object.keys(urls)) {
    const url = urls[key];
    const version = keyToVersion(key);
    if (!version) continue;

    builds[version] = {
      zip: url.replace(/\/tar\/g/, '/zip/').replace(/\.tar\.gz$/, '.zip'),
      tarball: url.replace(/\/zip\/g/, '/tar/').replace(/\.zip$/, '.tar.gz'),
    };
  }

  return builds;
}
