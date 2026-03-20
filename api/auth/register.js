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
    const { email, password, full_name } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password and full_name are required' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      email,
      password_hash: hash,
      full_name: String(full_name).trim(),
      role: 'user',
    });
    const safe = await User.findById(user._id).select('_id email full_name phone address role').lean();
    const token = jwt.sign({ userId: safe._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    const out = { id: safe._id.toString(), ...safe, _id: undefined };
    res.status(201).json({ success: true, token, user: out });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
