import PromiseRouter from 'express-promise-router';
import { getAll } from '../lib/github';
import { tagToBuild } from '../lib/releases';
import { getBranches } from '../lib/branches';

const router = new PromiseRouter();

let builds;
async function updateBuilds() {
  builds = { branches: {}, releases: {} };

  for (const { name } of await getAll('tags')) {
    const [tag, build] = tagToBuild(name);
    if (tag) builds.releases[tag] = build;
  }

  builds.branches = await getBranches();
}

let activeUpdate = updateBuilds();

/* GET home page. */
router.get('/builds', async function getBuildsRoute(req, res) {
  await activeUpdate;
  res.json(builds);
});

router.all('/builds/update', async function checkForUpdateRoute(req, res) {
  await activeUpdate.catch(() => null);

  activeUpdate = updateBuilds();
  await activeUpdate;

  res.send('okay');
});

router.get('/ping', function pingRoute(req, res) {
  res.send('pong');
});

module.exports = router;
