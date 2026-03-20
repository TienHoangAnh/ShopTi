const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'shopti-secret-key-change-in-production';

function getTokenFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function authenticate(req) {
  const token = getTokenFromReq(req);
  if (!token) return { error: { status: 401, message: 'Authentication required' } };
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('_id email full_name phone address role').lean();
    if (!user) return { error: { status: 401, message: 'User not found' } };
    const u = { id: user._id.toString(), ...user, _id: undefined };
    return { user: u };
  } catch (e) {
    return { error: { status: 401, message: 'Invalid or expired token' } };
  }
}

function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    return { error: { status: 403, message: 'Admin access required' } };
  }
  return {};
}

module.exports = { JWT_SECRET, getTokenFromReq, authenticate, requireAdmin };
