const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../../lib/mongodb');
const User = require('../../models/User');
const { JWT_SECRET } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).lean();
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const { password_hash, ...safe } = user;
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    const out = { id: user._id.toString(), ...safe, _id: undefined };
    res.json({ success: true, token, user: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
