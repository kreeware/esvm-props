import express from 'express'
import logger from 'morgan'
import Boom from 'boom'
export const app = express()

app.use(logger('dev'))
app.use('/', require('./routes/index'))
app.get('/status', (req, res) => {
  res.send('online')
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(Boom.notFound())
})

// error handlers
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const { output: { statusCode, headers, payload } } = Boom.wrap(err)
  res
    .set(headers)
    .type('json')
    .status(statusCode)
    .json(payload)
})
