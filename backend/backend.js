const express = require('express')
const app = express()
const routes = require('./routes')
const PORT = process.env.PORT !== undefined ? process.env.PORT : 8080

app.use('/', routes)

// Application will fail if environment variables are not set
if(!PORT) {
  const errMsg = "PORT environment variable is not defined"
  console.error(errMsg)
  throw new Error(errMsg)
}

// Starts an http server on the $PORT environment variable
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app