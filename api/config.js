module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Used by frontend checkout map panel.
  const token = process.env.MAPBOX_ACCESS_TOKEN || '';
  return res.json({ mapboxAccessToken: token });
};

