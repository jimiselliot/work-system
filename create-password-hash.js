/*const bcrypt = require('bcryptjs');

async function createPasswordHash() {
  const plainPassword = 'admin123'; // The password you want to hash
  
  try {
    console.log('🔐 Creating password hash...');
    console.log('Plain password:', plainPassword);
    
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    console.log('Generated salt:', salt);
    
    // Create hash
    const hash = await bcrypt.hash(plainPassword, salt);
    console.log('\n✅ HASH GENERATED:');
    console.log('==================');
    console.log(hash);
    console.log('==================');
    
    // Verify it works
    const isValid = await bcrypt.compare(plainPassword, hash);
    console.log('\n🔍 Verification:');
    console.log('Password match:', isValid ? '✅ YES' : '❌ NO');
    
    // Show SQL to update database
    console.log('\n📋 SQL to update database:');
    console.log(`
USE work_system;

-- For admin@system.com
UPDATE users SET password = '${hash}' WHERE email = 'admin@system.com';

-- For user@system.com  
UPDATE users SET password = '${hash}' WHERE email = 'user@system.com';
    `);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createPasswordHash();*/