import PromiseRouter from 'express-promise-router';
import { getAll } from '../lib/github';
import { tagToBuild } from '../lib/releases';
import { readBranches, branchToBuild } from '../lib/branches';

const router = new PromiseRouter();

let builds;
async function updateBuilds() {
  builds = { branches: {}, releases: {} };

  for (const { name } of await getAll('tags')) {
    const [tag, build] = tagToBuild(name);
    if (tag) builds.releases[tag] = build;
  }

  const { branches, bounds } = readBranches(await getAll('branches'));
  for (const branch of branches) {
    const [build] = branchToBuild(branch, bounds);
    if (build) builds.branches[branch] = build;
  }
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

module.exports = router;
