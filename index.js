const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passport = require('passport');
const redis = require('redis');
const keys = require('./config/keys');

require('./models/User');
require('./models/Blog');
require('./services/passport');
require('./services/cache');
// DB
mongoose.Promise = global.Promise;
mongoose.connect(keys.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const conn = mongoose.connection;
conn.on('error', (err) => {
  console.log('MONGOOSE: error');
  console.error(err);
});
conn.on('connected', () => {
  console.log('MONGOOSE: connected');
});

// redisClient.get('gretteing', (err, txt) => {
//   if (err) console.log(err);
//   else console.log(txt);
// });
// redisClient.flushall();
// redisClient.hset('gretteings', 'pl', 'Witaj Świecie');
// redisClient.hgetall('gretteings', (err, val) => {
//   console.log(val);
// });
// App
const app = express();
// Set Redis Client
// app.set('redisClient', redisClient);
app.use(express.json());
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey],
  })
);
app.use(passport.initialize());
app.use(passport.session());

require('./routes/authRoutes')(app);
require('./routes/blogRoutes')(app);

app.use(express.static('client/build'));
const path = require('path');
app.get('*', (req, res) => {
  res.sendFile(path.resolve('client', 'build', 'index.html'));
});
app.get('/', (req, res) => {
  res.status(200).json({ msg: 'Hello World' });
});

if (['production'].includes(process.env.NODE_ENV)) {
  app.use(express.static('client/build'));

  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Listening on port`, PORT);
});
