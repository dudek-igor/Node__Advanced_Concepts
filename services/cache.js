const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');

// 1. Instancja Redis
const redisUrl = 'redis://redis:6379';
const redisClient = redis.createClient(redisUrl);
redisClient.on('error', (err) => {
  console.log('REDIS: error');
  console.log(err);
});
redisClient.once('connect', (error) => {
  console.log('REDIS: connected');
});
redisClient.hget = promisify(redisClient.hget);

// 2. Referencja do oryginalnej funckcji exec
const exec = mongoose.Query.prototype.exec;

// UWAGA - używamy func przez ES6 by w mieć refernecję do obiektu Query poprzez this

// 3. Tworzymy naszą funkcje .cache()
mongoose.Query.prototype.cache = async function (options = {}) {
  // A. Set a cache flag
  this._cache = true;
  // B. Get Options
  this._hashKey = JSON.stringify(options.key || 'default');
  // C. By zachować łańcuchową ciągłość należy zwrócić this
  return this;
};

// 4. Przerabiamy default funkcje exec
mongoose.Query.prototype.exec = async function () {
  // I. this._cache - jest flagą poprzez naszą utworzoną funkcje .cache()
  const shouldCache = this._cache;
  // II. Jeżeli jest false zwracamy defualtową funkcje exec
  if (!shouldCache) {
    return exec.apply(this, arguments);
  } else {
    // III. Jeżeli jest true tworzymy logikę związaną z cache-owaniem

    // A. Tworzymy unikatowy klucz na podstawie danyh z zapytania
    const key = JSON.stringify(
      Object.assign({}, this.getFilter(), {
        collection: this.mongooseCollection.name,
      })
    );
    // B. See if we have a value for 'key' in Redis
    const cacheValue = await redisClient.hget(this._hashKey, key);
    // C. If we do, return that
    if (cacheValue) {
      // D. Parsujemy otrzymany obiekt z cache-u
      const doc = JSON.parse(cacheValue);
      // Musimy się zachować inaczej w przypadku tablic a inaczej w przypadku obiketów zwrazanych z redis-a
      // Check if parsed cacheValue is a Array
      return Array.isArray(doc)
        ? doc.map((d) => new this.model(d))
        : new this.model(doc);
    }
    // Otherwise, issue the query and store the results
    const result = await exec.apply(this, arguments);
    // Ustawaimy cache na godzinne
    redisClient.hset(this._hashKey, key, JSON.stringify(result), 'EX', 6000);
    return result;
  }
};

module.exports = {
  clearHash(hashKey) {
    redisClient.del(JSON.stringify(hashKey));
  },
};
