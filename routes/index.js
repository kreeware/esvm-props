var express = require('express');
var router = express.Router();
var get = require('https').get;

var urlsPath = require('path').resolve(__dirname, 'urls.json');

/* GET home page. */
router.get('/tags', function(req, res, next) {
  res.sendFile(urlsPath);
});

module.exports = router;
