import { satisfies } from 'semver';

export function tagToBuild(name) {
  const match = name.match(/^v?(\d+\.\d+\.\d+)(?:[\.\-](\w+))?$/);
  if (!match) return [];

  const tag = match[2] ? `${match[1]}-${match[2]}` : match[1];

  if (satisfies(tag, '>=2.0.0-beta1')) {
    debugger;
    return [tag, {
      zip: `https://download.elasticsearch.org/elasticsearch/release/org/elasticsearch/distribution/zip/elasticsearch/${tag}/elasticsearch-${tag}.zip`,
      tarball: `https://download.elasticsearch.org/elasticsearch/release/org/elasticsearch/distribution/tar/elasticsearch/${tag}/elasticsearch-${tag}.tar.gz`,
    }];
  }

  if (satisfies(tag, '<2.0.0-beta1') && satisfies(tag, '>=0.90')) {
    return [tag, {
      zip: `https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-${tag}.zip`,
      tarball: `https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-${tag}.tar.gz`,
    }];
  }

  return [];
}
