const Category = require('../../models/Category');

async function list(req, res) {
  const categories = await Category.find({}).sort({ name: 1 }).select('_id name').lean();
  res.json({
    success: true,
    categories: categories.map((c) => ({ id: c._id.toString(), name: c.name })),
  });
}

module.exports = { list };

