// utils/jwt.js - CHECK THIS FILE
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  // Make sure user object has correct structure
  const payload = {
    id: user.id,           // Should be number, NOT object
    username: user.username,
    email: user.email,
    role_id: user.role_id, // Should be number (1 or 2)
    role: user.role || (user.role_id === 1 ? 'admin' : 'user')
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };