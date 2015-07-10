var express = require('express');
var router = express.Router();
var get = require('https').get;

/* GET home page. */
router.get('/tags', function(req, res, next) {
  get({
    host: 'api.github.com',
    port: 443,
    path: '/repos/elastic/elasticsearch/tags?per_page=100',
    headers: {
      'user-agent': 'spalger'
    }
  })
  .on('response', function (incoming) {
    incoming.pipe(res);
  }).on('error', next);
});

module.exports = router;
