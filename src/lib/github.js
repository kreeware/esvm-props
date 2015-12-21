import { fromNode as fn } from 'bluebird';
import Wreck from 'wreck';
import parseLinkHeader from 'parse-link-header';

const wreck = Wreck.defaults({
  baseUrl: 'https://api.github.com',
  redirects: 3,
  rejectUnauthorized: true,

  headers: {
    'user-agent': 'esvm-props.kibana.rocks',
  },
});

function request(url, opts = { json: true }) {
  return fn(cb => {
    wreck.get(url, opts, (err, resp, payload) => {
      if (err) return cb(err);
      cb(null, { ...resp, payload });
    });
  });
}

export async function getAll(item) {
  let nextUrl = `/repos/elastic/elasticsearch/${item}?per_page=100`;
  let all = [];

  while (nextUrl) {
    const { headers, payload } = await request(nextUrl);
    const links = parseLinkHeader(headers.link);
    nextUrl = links && links.next ? links.next.url : null;

    all = [...all, ...payload];
  }

  return all;
}