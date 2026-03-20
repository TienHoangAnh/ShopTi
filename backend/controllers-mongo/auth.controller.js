const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { JWT_SECRET } = require('../middleware/authMongo');

async function register(req, res) {
  const { email, password, full_name } = req.body || {};
  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Email, password and full_name are required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const user = await User.create({
      email,
      password_hash: hash,
      full_name,
      role: 'user',
    });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (e) {
    if (String(e.message || '').toLowerCase().includes('duplicate key')) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    throw e;
  }
}

async function login(req, res) {
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
  res.json({ success: true, token, user: { id: user._id.toString(), ...safe, _id: undefined } });
}

async function me(req, res) {
  res.json({ success: true, user: req.user });
}

async function profile(req, res) {
  const { full_name, phone, address } = req.body || {};
  const updates = {};
  if (full_name !== undefined) updates.full_name = String(full_name).trim();
  if (phone !== undefined) updates.phone = phone === null || phone === '' ? null : String(phone).trim();
  if (address !== undefined) updates.address = address === null || address === '' ? null : String(address).trim();
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true })
    .select('_id email full_name phone address role')
    .lean();
  res.json({
    success: true,
    user: { id: updated._id.toString(), ...updated, _id: undefined },
  });
}

module.exports = { register, login, me, profile };

