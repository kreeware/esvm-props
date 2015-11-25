import { satisfies } from 'semver';

export function branchToVersion(branch, bounds, ultimateBound) {
  if (branch === 'master') {
    return `${ultimateBound + 1}.0.0`;
  }

  let match = branch.match(/^(\d+)\.x$/);
  if (match) {
    return `${match[1]}.${bounds[match[1]] + 1}.0`;
  }

  match = branch.match(/^(\d+)\.(\d+)$/);
  if (match) {
    return `${match[1]}.${match[2]}.0`;
  }
}

export function readBranches(payload) {
  let branches = [];
  for (const { name } of payload) branches.push(name);
  branches = branches.sort().reverse();

  const bounds = {};
  for (const branch of branches) {
    const match = branch.match(/^(\d+)\.(\d+)$/);
    if (!match) continue;

    const major = match[1];
    const minor = parseFloat(match[2]);
    bounds[major] = Math.max(bounds[major] || 0, minor);
  }

  bounds[Infinity] = Math.max(...Object.keys(bounds).map(parseFloat));

  return { bounds, branches };
}

export function branchToBuild(branch, bounds) {
  const version = branchToVersion(branch, bounds, bounds[Infinity]);
  if (!version || satisfies(version, '<0.90')) {
    return [];
  }

  let host;
  let bucket;
  let prefix;
  let jdk;

  if (satisfies(version, '<=1.0')) {
    host = 's3-us-west-2.amazonaws.com';
    bucket = 'build.elasticsearch.org';
    jdk = 'JDK6';
  } else {
    host = 's3-eu-west-1.amazonaws.com';
    bucket = 'build-eu.elasticsearch.org';
    jdk = 'JDK7';
  }

  if (branch === 'master') {
    prefix = `origin/${branch}`;
  } else {
    prefix = `origin/${branch}/nightly/${jdk}`;
  }

  if (satisfies(version, '>=2.2 || 2.0 || 1.6 || 1.5')) {
    bucket = 'build.eu-west-1.elastic.co';
  } else if (satisfies(version, '2.1 || >=1.7 || 1.4 - 1.1')) {
    bucket = 'build-eu.elasticsearch.org';
  }

  return [
    {
      zip: `http://${host}/${bucket}/${prefix}/elasticsearch-latest-SNAPSHOT.zip`,
      tarball: `http://${host}/${bucket}/${prefix}/elasticsearch-latest-SNAPSHOT.tar.gz`,
    },
  ];
}
