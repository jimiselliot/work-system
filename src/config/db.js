const mysql = require('mysql2/promise');

// Load env for local dev; Railway provides these automatically in production
require('dotenv').config({ path: '../../.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'jim',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'root',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'work_system',
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,

  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,

  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  debug: false,
  namedPlaceholders: true
});

console.log('🔧 Database Configuration:');
console.log('  Host:', process.env.DB_HOST || process.env.MYSQLHOST || 'localhost');
console.log('  User:', process.env.DB_USER || process.env.MYSQLUSER || 'jim');
console.log('  Database:', process.env.DB_NAME || process.env.MYSQLDATABASE || 'work_system');
console.log('  Password:', process.env.DB_PASSWORD || process.env.MYSQLPASSWORD ? '***' : '(empty)');

module.exports = pool;
// ============================================
// 1. DATABASE SETUP FUNCTIONS (Auto-creates everything)
// ============================================

// Function to create database if it doesn't exist
const createDatabaseIfNotExists = async () => {
  const tempPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jim',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 3306
  });
  
  try {
    const dbName = process.env.DB_NAME || 'work_system';
    
    // Create database if it doesn't exist
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);
    
    // Use the database
    await tempPool.query(`USE \`${dbName}\``);
    
    // Create users table with ALL required columns
    await tempPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT DEFAULT 2,
        status VARCHAR(20) DEFAULT 'active',
        last_login DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_role (role_id)
      ) ENGINE=InnoDB
    `);
    
    console.log('✅ Users table created or already exists');
    
    // Create projects table
    await tempPool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM('active', 'completed', 'on_hold') DEFAULT 'active',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      ) ENGINE=InnoDB
    `);
    
    console.log('✅ Projects table created or already exists');
    
    // Create tasks table (for future use)
    await tempPool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        project_id INT NOT NULL,
        assigned_to INT,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        due_date DATE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_assigned (assigned_to),
        INDEX idx_status (status)
      ) ENGINE=InnoDB
    `);
    
    console.log('✅ Tasks table created or already exists');
    
    // CREATE AUDIT_LOGS TABLE FOR DASHBOARD FUNCTIONALITY
    await tempPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INT,
        old_value TEXT,
        new_value TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_table_record (table_name, record_id)
      ) ENGINE=InnoDB
    `);
    
    console.log('✅ Audit logs table created or already exists');
    
    // Check if we have at least one admin user
    const [users] = await tempPool.query('SELECT COUNT(*) as count FROM users WHERE role_id = 1');
    if (users[0].count === 0) {
      console.log('⚠️  No admin users found. Creating default users...');
      
      // Create default admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      await tempPool.query(
        `INSERT INTO users (username, email, password, role_id, status) 
         VALUES (?, ?, ?, ?, ?)`,
        ['admin', 'admin@system.com', adminPassword, 1, 'active']
      );
      
      console.log('✅ Default admin created: admin@system.com / admin123');
      
      // Create default regular user
      const userPassword = await bcrypt.hash('user123', 10);
      await tempPool.query(
        `INSERT INTO users (username, email, password, role_id, status) 
         VALUES (?, ?, ?, ?, ?)`,
        ['user', 'user@system.com', userPassword, 2, 'active']
      );
      
      console.log('✅ Default user created: user@system.com / user123');
      
      // Insert sample projects for the admin user
      await tempPool.query(`
        INSERT INTO projects (name, description, status, created_by) VALUES
        ('E-commerce Website', 'Build a React and MySQL e-commerce application', 'active', 1),
        ('Mobile App Development', 'Create a cross-platform mobile application', 'active', 1),
        ('CRM System', 'Customer Relationship Management system', 'on_hold', 1),
        ('Company Website Redesign', 'Redesign and modernize the company website', 'active', 1),
        ('Inventory Management System', 'Develop inventory tracking and management software', 'completed', 1)
      `);
      
      console.log('✅ Inserted 5 sample projects');
      
      // INSERT SAMPLE AUDIT LOGS FOR TESTING
      await tempPool.query(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, created_at) VALUES
        (1, 'LOGIN', 'users', 1, NOW()),
        (1, 'CREATE_PROJECT', 'projects', 1, NOW()),
        (1, 'CREATE_TASK', 'tasks', 1, NOW()),
        (2, 'LOGIN', 'users', 2, NOW()),
        (1, 'UPDATE_PROJECT', 'projects', 1, NOW()),
        (1, 'UPDATE_TASK_STATUS', 'tasks', 1, NOW()),
        (2, 'VIEW_DASHBOARD', 'users', 2, NOW()),
        (1, 'CREATE_PROJECT', 'projects', 2, NOW()),
        (1, 'ASSIGN_TASK', 'tasks', 1, NOW()),
        (1, 'COMPLETE_TASK', 'tasks', 1, NOW())
      `);
      
      console.log('✅ Inserted 10 sample audit logs');
      
    } else {
      // Check if we have projects
      const [projects] = await tempPool.query('SELECT COUNT(*) as count FROM projects');
      if (projects[0].count === 0) {
        console.log('⚠️  No projects found. Creating sample projects...');
        
        // Get first user ID to create sample projects
        const [firstUser] = await tempPool.query('SELECT id FROM users ORDER BY id LIMIT 1');
        if (firstUser.length > 0) {
          const userId = firstUser[0].id;
          
          await tempPool.query(`
            INSERT INTO projects (name, description, status, created_by) VALUES
            ('E-commerce Website', 'Build a React and MySQL e-commerce application', 'active', ?),
            ('Mobile App Development', 'Create a cross-platform mobile application', 'active', ?),
            ('CRM System', 'Customer Relationship Management system', 'on_hold', ?)
          `, [userId, userId, userId]);
          
          console.log(`✅ Created 3 sample projects for user ID: ${userId}`);
        }
      }
      
      // Check if we have audit logs and add some if not
      const [auditLogs] = await tempPool.query('SELECT COUNT(*) as count FROM audit_logs');
      if (auditLogs[0].count === 0) {
        console.log('⚠️  No audit logs found. Creating sample logs...');
        
        const [firstUser] = await tempPool.query('SELECT id FROM users ORDER BY id LIMIT 1');
        if (firstUser.length > 0) {
          const userId = firstUser[0].id;
          
          await tempPool.query(`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, created_at) VALUES
            (?, 'LOGIN', 'users', ?, NOW()),
            (?, 'VIEW_DASHBOARD', 'users', ?, NOW()),
            (?, 'UPDATE_PROFILE', 'users', ?, NOW())
          `, [userId, userId, userId, userId, userId, userId]);
          
          console.log(`✅ Created 3 sample audit logs for user ID: ${userId}`);
        }
      }
    }
    
    // Show existing users
    const [existingUsers] = await tempPool.query(
      'SELECT id, username, email, role_id, status FROM users ORDER BY id'
    );
    
    console.log(`📊 Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      const role = user.role_id === 1 ? 'Admin' : 'User';
      console.log(`  ${user.id}. ${user.username} (${user.email}) - ${role} - ${user.status}`);
    });
    
    // Show existing projects
    const [existingProjects] = await tempPool.query(`
      SELECT p.id, p.name, p.status, u.username as creator_name 
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id 
      ORDER BY p.created_at DESC LIMIT 5
    `);
    
    if (existingProjects.length > 0) {
      console.log(`📊 Found ${existingProjects.length} projects:`);
      existingProjects.forEach(project => {
        console.log(`  ${project.id}. ${project.name} - ${project.status} - Created by: ${project.creator_name}`);
      });
    }
    
    // Show existing audit logs count
    const [auditLogsCount] = await tempPool.query('SELECT COUNT(*) as count FROM audit_logs');
    console.log(`📊 Found ${auditLogsCount[0].count} audit logs`);
    
    await tempPool.end();
    return true;
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 MySQL Access Denied. Please check:');
      console.log('1. MySQL service is running: sudo service mysql status');
      console.log('2. User credentials are correct in .env file');
      console.log('3. Try: mysql -u jim -proot');
    } else if (error.code === 'ER_CANT_CREATE_TABLE') {
      console.log('\n💡 Table creation error. Trying without foreign keys first...');
      try {
        // Try creating tables without foreign keys first
        await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'work_system'}\``);
        await tempPool.query(`USE \`${process.env.DB_NAME || 'work_system'}\``);
        
        // Create users table without any references
        await tempPool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role_id INT DEFAULT 2,
            status VARCHAR(20) DEFAULT 'active',
            last_login DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // Create projects table without foreign key
        await tempPool.query(`
          CREATE TABLE IF NOT EXISTS projects (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status ENUM('active', 'completed', 'on_hold') DEFAULT 'active',
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // Create tasks table without foreign keys
        await tempPool.query(`
          CREATE TABLE IF NOT EXISTS tasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            project_id INT NOT NULL,
            assigned_to INT,
            status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            due_date DATE,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // Create audit_logs table without foreign keys
        await tempPool.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            action VARCHAR(50) NOT NULL,
            table_name VARCHAR(50) NOT NULL,
            record_id INT,
            old_value TEXT,
            new_value TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('✅ Created tables without foreign keys (for initial setup)');
        
      } catch (simpleError) {
        console.error('❌ Even simple table creation failed:', simpleError.message);
      }
    }
    
    await tempPool.end();
    return false;
  }
};

// ============================================
// 2. CONNECTION TESTING
// ============================================

// Function to test database connection
const testConnection = async () => {
  let connection;
  try {
    console.log('🔌 Testing database connection...');
    console.log(`  as ${process.env.DB_USER || 'jim'}@${process.env.DB_HOST || 'localhost'}`);
    
    connection = await pool.getConnection();
    
    // Simple test query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log(`✅ Database connected! Test query: ${rows[0].result}`);
    
    // Get database info
    const [dbInfo] = await connection.query(
      'SELECT DATABASE() as db, VERSION() as version, USER() as user'
    );
    console.log(`📊 Connected to: ${dbInfo[0].db}`);
    console.log(`🔢 MySQL Version: ${dbInfo[0].version}`);
    console.log(`👤 Connected as: ${dbInfo[0].user}`);
    
    // Check all tables
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || 'work_system']
    );
    
    console.log(`📋 Found ${tables.length} tables:`);
    
    // Check important tables including audit_logs
    const importantTables = ['users', 'projects', 'tasks', 'audit_logs'];
    
    for (const tableName of importantTables) {
      const exists = tables.some(t => t.TABLE_NAME === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
      
      // If table exists, check count
      if (exists) {
        try {
          const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`    📊 Records: ${count[0].count}`);
        } catch (e) {
          console.log(`    📊 Could not count records`);
        }
      }
    }
    
    // Check projects table structure
    if (tables.some(t => t.TABLE_NAME === 'projects')) {
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE 
         FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects'
         ORDER BY ORDINAL_POSITION`,
        [process.env.DB_NAME || 'work_system']
      );
      
      console.log(`    Columns in projects table:`);
      columns.forEach(col => {
        const key = col.COLUMN_KEY ? ` (${col.COLUMN_KEY})` : '';
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})${key}`);
      });
    }
    
    connection.release();
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    // More specific help
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check if password is correct');
      console.log('2. Try: mysql -u jim -proot');
      console.log('3. Or use root: mysql -u root -p');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database does not exist. Creating it...');
      await createDatabaseIfNotExists();
    }
    
    if (connection) connection.release();
    return false;
  }
};

// ============================================
// 3. SCHEMA MANAGEMENT
// ============================================

// Function to check and update database schema if needed
const checkAndUpdateSchema = async () => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if projects table exists
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects'`,
      [process.env.DB_NAME || 'work_system']
    );
    
    if (tables.length === 0) {
      console.log('➕ Creating missing projects table...');
      await connection.query(`
        CREATE TABLE projects (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          status ENUM('active', 'completed', 'on_hold') DEFAULT 'active',
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_status (status),
          INDEX idx_created_by (created_by)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Projects table created');
    }
    
    // Check if audit_logs table exists
    const [auditTables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'audit_logs'`,
      [process.env.DB_NAME || 'work_system']
    );
    
    if (auditTables.length === 0) {
      console.log('➕ Creating missing audit_logs table...');
      await connection.query(`
        CREATE TABLE audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT,
          action VARCHAR(50) NOT NULL,
          table_name VARCHAR(50) NOT NULL,
          record_id INT,
          old_value TEXT,
          new_value TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at),
          INDEX idx_table_record (table_name, record_id)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Audit logs table created');
    }
    
    // Add any missing columns to projects table
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects'`,
      [process.env.DB_NAME || 'work_system']
    );
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Ensure projects table has all required columns
    const requiredColumns = [
      { name: 'description', sql: "ADD COLUMN description TEXT AFTER name" },
      { name: 'status', sql: "ADD COLUMN status ENUM('active', 'completed', 'on_hold') DEFAULT 'active' AFTER description" },
      { name: 'updated_at', sql: "ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at" }
    ];
    
    let addedColumns = 0;
    for (const column of requiredColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`➕ Adding missing column to projects: ${column.name}`);
        try {
          await connection.query(`ALTER TABLE projects ${column.sql}`);
          console.log(`✅ Added column: ${column.name}`);
          addedColumns++;
        } catch (alterError) {
          console.error(`❌ Failed to add column ${column.name}:`, alterError.message);
        }
      }
    }
    
    if (addedColumns > 0) {
      console.log(`✅ Added ${addedColumns} missing columns to projects table`);
    } else {
      console.log('✅ Projects table schema is up to date');
    }
    
    connection.release();
    return true;
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    if (connection) connection.release();
    return false;
  }
};

// ============================================
// 4. QUERY FUNCTIONS (For your app to use)
// ============================================

// Function to execute a query with error handling
const query = async (sql, params = []) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Format the SQL for better logging
    const formattedSQL = sql.replace(/\s+/g, ' ').trim();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Executing query:', formattedSQL.substring(0, 100) + (formattedSQL.length > 100 ? '...' : ''));
      if (params.length > 0) {
        console.log('   Params:', params);
      }
    }
    
    const [results] = await connection.query(sql, params);
    connection.release();
    
    // Log results for debugging (but limit output)
    if (process.env.NODE_ENV === 'development') {
      if (Array.isArray(results)) {
        console.log(`📊 Query returned ${results.length} rows`);
      } else {
        console.log(`📊 Query affected ${results.affectedRows || 0} rows`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('Query:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
    console.error('Params:', params.length > 0 ? params.slice(0, 5) : 'None');
    console.error('Error Code:', error.code);
    console.error('SQL State:', error.sqlState);
    
    // Provide helpful error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('💡 Table does not exist. The database may need to be setup.');
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('💡 Column does not exist. Please check your database schema.');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.error('💡 Duplicate entry. This record already exists.');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('💡 Foreign key constraint failed. Referenced user does not exist.');
    }
    
    if (connection) connection.release();
    throw error;
  }
};

// ✅ ADD THIS: execute function (alias for query to maintain compatibility)
const execute = async (sql, params = []) => {
  return query(sql, params);
};

// Function to execute a transaction
const transaction = async (callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    console.log('🔒 Transaction started');
    
    const result = await callback(connection);
    
    await connection.commit();
    connection.release();
    
    console.log('✅ Transaction committed');
    return result;
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
      console.log('↩️  Transaction rolled back');
    }
    console.error('❌ Transaction failed:', error.message);
    throw error;
  }
};

// ============================================
// 5. DATABASE STATISTICS
// ============================================

// Function to get database stats
const getDatabaseStats = async () => {
  try {
    const stats = {
      users: 0,
      activeUsers: 0,
      admins: 0,
      projects: 0,
      activeProjects: 0,
      totalTables: 0,
      auditLogs: 0
    };
    
    const connection = await pool.getConnection();
    
    // Get user counts
    const [userCounts] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN role_id = 1 THEN 1 ELSE 0 END) as admins
      FROM users
    `);
    
    if (userCounts.length > 0) {
      stats.users = userCounts[0].total;
      stats.activeUsers = userCounts[0].active;
      stats.admins = userCounts[0].admins;
    }
    
    // Get project counts
    const [projectCounts] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM projects
    `);
    
    if (projectCounts.length > 0) {
      stats.projects = projectCounts[0].total;
      stats.activeProjects = projectCounts[0].active;
    }
    
    // Get audit logs count
    const [auditLogsCount] = await connection.query('SELECT COUNT(*) as count FROM audit_logs');
    if (auditLogsCount.length > 0) {
      stats.auditLogs = auditLogsCount[0].count;
    }
    
    // Get table count
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || 'work_system']
    );
    
    if (tables.length > 0) {
      stats.totalTables = tables[0].count;
    }
    
    connection.release();
    return stats;
    
  } catch (error) {
    console.error('Error getting database stats:', error.message);
    return null;
  }
};

// ============================================
// 6. INITIALIZATION (MAIN FUNCTION)
// ============================================

// Initialize database connection and check schema
const initializeDatabase = async () => {
  console.log('🚀 Initializing database...');
  
  // First, try to connect
  let isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('⚠️  Direct connection failed. Attempting to create database...');
    isConnected = await createDatabaseIfNotExists();
    
    if (!isConnected) {
      console.error('❌ Failed to create database. Please check MySQL is running.');
      return false;
    }
    
    // Try connecting again after creation
    console.log('🔄 Testing connection after database creation...');
    isConnected = await testConnection();
  }
  
  if (isConnected) {
    // Check and update schema if needed
    await checkAndUpdateSchema();
    
    // Log database stats
    const stats = await getDatabaseStats();
    if (stats) {
      console.log('📊 Database Statistics:');
      console.log(`  Total Users: ${stats.users}`);
      console.log(`  Active Users: ${stats.activeUsers}`);
      console.log(`  Administrators: ${stats.admins}`);
      console.log(`  Total Projects: ${stats.projects}`);
      console.log(`  Active Projects: ${stats.activeProjects}`);
      console.log(`  Audit Logs: ${stats.auditLogs}`);
      console.log(`  Total Tables: ${stats.totalTables}`);
      
      if (stats.users === 0) {
        console.log('⚠️  No users found. Creating default users...');
        await createDatabaseIfNotExists();
      }
    }
    
    console.log('✅ Database initialization completed successfully!');
    console.log('\n📋 Default login credentials:');
    console.log('   Admin: admin@system.com / admin123');
    console.log('   User:  user@system.com / user123');
    console.log('   Sample projects have been created for testing.');
    console.log('   Audit logs table has been created for dashboard functionality.');
    
    return true;
  } else {
    console.error('⚠️  Database initialization failed. Some features may not work properly.');
    return false;
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = {
  // Core connection
  pool,
  
  // Query functions (for DAO files to use)
  query,
  execute, // ✅ ADDED THIS LINE - alias for query
  transaction,
  
  // Setup & testing
  testConnection,
  createDatabaseIfNotExists,
  checkAndUpdateSchema,
  getDatabaseStats,
  initializeDatabase
};