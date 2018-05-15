const { clearHash } = require('../services/cache');

module.exports = async (req, res, next) => {
  // hack: wait route -handler to execute and come back to clear hash...
  // e.g. => do not clear hash if there was an error in creatning blog post
  await next();
  clearHash(req.user.id);
};
