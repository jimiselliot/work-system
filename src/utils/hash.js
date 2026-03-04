// src/utils/hash.js
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10); // Use salt rounds 10 to match your schema
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};