const { connectDB } = require('../../lib/mongodb');
const User = require('../../models/User');
const { authenticate } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const { full_name, phone, address } = req.body || {};
    const updates = {};
    if (full_name !== undefined) updates.full_name = String(full_name).trim();
    if (phone !== undefined) updates.phone = phone === null || phone === '' ? null : String(phone).trim();
    if (address !== undefined) updates.address = address === null || address === '' ? null : String(address).trim();
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    const user = await User.findByIdAndUpdate(auth.user.id, { $set: updates }, { new: true })
      .select('_id email full_name phone address role')
      .lean();
    const out = { id: user._id.toString(), ...user, _id: undefined };
    res.json({ success: true, user: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
