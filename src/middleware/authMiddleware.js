const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔍 Dashboard Auth - Path:', req.path);
  console.log('🔍 Dashboard Auth - Has token?', !!req.headers.authorization);
  if (req.headers.authorization) {
    console.log('🔍 Dashboard Auth - Token:', req.headers.authorization.substring(0, 30) + '...');
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }

  // ✅ CRITICAL FIX: Handle both token formats
  console.log('🔐 Decoded token:', decoded);
  
  // Format 1: decoded.id is an object containing user data
  if (decoded.id && typeof decoded.id === 'object') {
    req.user = {
      id: decoded.id.id || decoded.id.userId,
      username: decoded.id.username,
      email: decoded.id.email,
      role_id: decoded.id.role_id,
      role: decoded.id.role
    };
  }
  // Format 2: decoded contains user data directly
  else {
    req.user = {
      id: decoded.id || decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role_id: decoded.role_id,
      role: decoded.role || (decoded.role_id === 1 ? 'admin' : 'user')
    };
  }
  
  // Ensure role_id is a number
  req.user.role_id = parseInt(req.user.role_id) || 2;
  
  // Ensure role string is correct
  if (!req.user.role) {
    req.user.role = req.user.role_id === 1 ? 'admin' : 'user';
  }
  
  console.log('✅ Authenticated user (FIXED):', req.user);
  next();
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated.' 
      });
    }

    console.log('🔍 Authorization check:', {
      userRole: req.user.role,
      requiredRoles: roles,
      hasAccess: roles.includes(req.user.role)
    });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };