import { fromNode as fn } from 'bluebird';
import { get } from 'http';
import { createGunzip } from 'zlib';
import tar from 'tar';
import JSZip from 'jszip';

async function send(url) {
  return await fn(cb => {
    const req = get(url)
    .on('error', cb)
    .on('response', function onResponse(resp) {
      cb(null, { req, resp });
    });
  });
}

async function download(stream, block) {
  const chunks = [];

  await fn(cb => {
    stream
    .on('error', cb)
    .on('data', chunk => {
      chunks.push(chunk);
    })
    .on('end', () => cb());
  });

  const unzip = new JSZip();
  unzip.load(Buffer.concat(chunks));
  const file = unzip.file('es-build.properties');
  if (!file) return '';
  return file.asText();
}

export async function verifyHash(zipUrl) {
  const { req, resp } = await send(zipUrl);

  if (resp.statusCode !== 200) {
    throw new Error(`received an unexpected ${resp.statusCode} response`);
  }

  return new Promise(function verfiyHashAsync(resolve, reject) {
    const ungz = createGunzip();
    const untar = new tar.Parse();

    resp.pipe(ungz).pipe(untar);

    ungz.on('error', reject);
    untar.on('error', reject);

    untar.on('entry', function onSnapEntry(entry) {
      if (!entry.path.match(/elasticsearch-[\d\.]+\.jar$/)) {
        entry.abort();
        return;
      }

      untar.removeListener('entry', onSnapEntry);

      download(entry)
      .then((buildProps) => {
        resp.unpipe(ungz);
        ungz.unpipe(untar);
        req.abort();

        return buildProps;
      })
      .then(resolve, reject);
    });
  });
}
