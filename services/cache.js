const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');

  return this;
};

mongoose.Query.prototype.exec = async function() {
  // console.log(this.useCache);
  if (!this.useCache) {
    // console.log('DO NOT USE CACHE for', this.getQuery());
    return exec.apply(this, arguments);
  }
  // console.log('USE CACHE for', this.getQuery());

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );
  // console.log('@ key', key);

  const cacheValue = await client.hget(this.hashKey, key);
  // console.log('@ cacheValue', cacheValue);
  if (cacheValue) {
    // console.log('I do have a cached value, it is: ', cacheValue);
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  const result = await exec.apply(this, arguments);
  // console.log(result);
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
