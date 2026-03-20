/**
 * Get dynamic segment from path. Vercel may pass it as req.query.id or we parse from req.url.
 * @param {object} req - request (req.query, req.url)
 * @param {string} pathPrefix - e.g. 'api/products/' or 'api/orders/'
 * @param {string} paramName - e.g. 'id'
 * @returns {string|null}
 */
function getPathParam(req, pathPrefix, paramName = 'id') {
  if (req.query && req.query[paramName]) return req.query[paramName];
  const url = req.url || '';
  const prefix = '/' + pathPrefix.replace(/^\/+/, '');
  const i = url.indexOf(prefix);
  if (i === -1) return null;
  const rest = url.slice(i + prefix.length).split('?')[0].split('/').filter(Boolean);
  return rest[0] || null;
}

module.exports = { getPathParam };
