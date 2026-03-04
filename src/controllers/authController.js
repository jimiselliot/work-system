// controllers/authController.js
const userDao = require('../dao/userDao');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

// =======================
// SIGNUP - COMPLETE FIXED VERSION
// =======================
exports.signup = async (req, res) => {
  try {
    console.log('📝 SIGNUP REQUEST:', req.body);
    
    const { username, email, password, role_id = 2 } = req.body;
    
    // 1. VALIDATION
    if (!username || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Username, email and password are required' 
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }
    
    // Password length check
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // 2. CHECK IF USER EXISTS
    console.log('🔍 Checking if user exists:', email);
    const existingUser = await userDao.findByEmail(email);
    
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }
    
    // 3. HASH PASSWORD
    console.log('🔐 Hashing password...');
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Password hashed successfully');
    } catch (hashError) {
      console.error('❌ Password hashing failed:', hashError);
      return res.status(500).json({ 
        success: false,
        message: 'Error processing password' 
      });
    }
    
    // 4. CREATE USER
    console.log('👤 Creating user in database...');
    
    // Prepare user data for DAO
    const userData = {
      name: username, // userDao.create() expects 'name' not 'username'
      email: email,
      passwordHash: hashedPassword,
      role: role_id === 1 ? 'admin' : 'user' // Convert to string 'admin' or 'user'
    };
    
    console.log('User data for DAO:', userData);
    
    let user;
    try {
      user = await userDao.create(userData);
      console.log('✅ User created in database:', user);
    } catch (dbError) {
      console.error('❌ Database error creating user:', dbError);
      
      // Check for duplicate entry error
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          success: false,
          message: 'Username or email already exists' 
        });
      }
      
      return res.status(500).json({ 
        success: false,
        message: 'Database error creating user' 
      });
    }
    
    // 5. GENERATE TOKEN
    console.log('🔑 Generating JWT token...');
    let token;
    try {
      // Generate token with proper payload
      const tokenPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role: user.role_id === 1 ? 'admin' : 'user'
      };
      
      token = generateToken(tokenPayload);
      console.log('✅ Token generated');
    } catch (tokenError) {
      console.error('❌ Token generation failed:', tokenError);
      // User was created, but token failed - still return success
      // but without token
    }
    
    // 6. PREPARE RESPONSE
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role: user.role_id === 1 ? 'admin' : 'user'
    };
    
    console.log('✅ SIGNUP SUCCESSFUL for:', email);
    console.log('User created:', userResponse);
    
    // 7. SEND RESPONSE
    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      token: token || null,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ UNEXPECTED SIGNUP ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error during signup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// LOGIN - FIXED VERSION
// =======================
exports.login = async (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST for:', req.body.email);
    
    const { email, password } = req.body;
    
    // 1. VALIDATION
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    
    // 2. FIND USER
    console.log('🔍 Looking for user:', email);
    const user = await userDao.getUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    console.log('✅ User found:', user.email);
    
    // 3. CHECK STATUS
    if (user.status && user.status !== 'active') {
      console.log('❌ User not active:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Account is not active. Please contact administrator.' 
      });
    }
    
    // 4. VERIFY PASSWORD
    console.log('🔐 Verifying password...');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Password incorrect for:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    console.log('✅ Password verified');
    
    // 5. UPDATE LAST LOGIN
    try {
      await userDao.update(user.id, { last_login: new Date() });
    } catch (updateError) {
      console.log('⚠️ Could not update last_login:', updateError.message);
      // Continue anyway - not critical
    }
    
    // 6. GENERATE TOKEN
    console.log('🔑 Generating JWT token...');
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role: user.role_id === 1 ? 'admin' : 'user'
    };
    
    const token = generateToken(tokenPayload);
    console.log('✅ Token generated');
    
    // 7. PREPARE RESPONSE
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role: user.role_id === 1 ? 'admin' : 'user',
      status: user.status || 'active'
    };
    
    console.log('✅ LOGIN SUCCESSFUL for:', email);
    
    // 8. SEND RESPONSE
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =======================
// GET CURRENT USER
// =======================
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('👤 GET CURRENT USER for ID:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const user = await userDao.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role: user.role_id === 1 ? 'admin' : 'user',
      status: user.status || 'active',
      created_at: user.created_at,
      last_login: user.last_login
    };
    
    console.log('✅ Current user retrieved:', user.email);
    
    res.status(200).json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ GET CURRENT USER ERROR:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user data'
    });
  }
};