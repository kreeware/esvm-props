import express from 'express';
import { get } from 'https';
import PromiseRouter from 'express-promise-router';

const router = new PromiseRouter();
const urlsPath = require('path').resolve(__dirname, 'urls.json');

/* GET home page. */
router.get('/tags', async function(req, res) {
  res.sendFile(urlsPath);
});

router.all('/update', async function (req, res) {
  res.send('okay');
});

module.exports = router;
