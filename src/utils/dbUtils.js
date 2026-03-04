const { query, transaction } = require('../config/db');

class DBUtils {
  // Find one record
  static async findOne(table, where = {}, columns = '*') {
    const whereClause = Object.keys(where).length > 0 
      ? `WHERE ${Object.keys(where).map(key => `${key} = ?`).join(' AND ')}`
      : '';
    
    const sql = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
    const values = Object.values(where);
    
    const results = await query(sql, values);
    return results[0] || null;
  }

  // Find multiple records
  static async findMany(table, where = {}, options = {}) {
    const {
      columns = '*',
      orderBy = 'id DESC',
      limit = 100,
      offset = 0
    } = options;
    
    const whereClause = Object.keys(where).length > 0 
      ? `WHERE ${Object.keys(where).map(key => `${key} = ?`).join(' AND ')}`
      : '';
    
    const sql = `
      SELECT ${columns} FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const values = [...Object.values(where), limit, offset];
    return await query(sql, values);
  }

  // Insert a record
  static async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const values = Object.values(data);
    
    const result = await query(sql, values);
    return result.insertId;
  }

  // Update a record
  static async update(table, id, data) {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${updates} WHERE id = ?`;
    const values = [...Object.values(data), id];
    
    const result = await query(sql, values);
    return result.affectedRows;
  }

  // Delete a record (soft delete if table has deleted_at column)
  static async delete(table, id, hardDelete = false) {
    // Check if table has deleted_at column
    const tableInfo = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = 'deleted_at'
    `, [process.env.DB_NAME, table]);
    
    if (tableInfo.length > 0 && !hardDelete) {
      // Soft delete
      const sql = `UPDATE ${table} SET deleted_at = NOW() WHERE id = ?`;
      const result = await query(sql, [id]);
      return result.affectedRows;
    } else {
      // Hard delete
      const sql = `DELETE FROM ${table} WHERE id = ?`;
      const result = await query(sql, [id]);
      return result.affectedRows;
    }
  }

  // Count records
  static async count(table, where = {}) {
    const whereClause = Object.keys(where).length > 0 
      ? `WHERE ${Object.keys(where).map(key => `${key} = ?`).join(' AND ')}`
      : '';
    
    const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const values = Object.values(where);
    
    const result = await query(sql, values);
    return parseInt(result[0].count);
  }

  // Check if record exists
  static async exists(table, where) {
    const count = await this.count(table, where);
    return count > 0;
  }

  // Pagination helper
  static async paginate(table, where = {}, options = {}) {
    const {
      page = 1,
      perPage = 10,
      orderBy = 'id DESC',
      columns = '*'
    } = options;
    
    const offset = (page - 1) * perPage;
    
    // Get data
    const data = await this.findMany(table, where, {
      columns,
      orderBy,
      limit: perPage,
      offset
    });
    
    // Get total count
    const total = await this.count(table, where);
    const totalPages = Math.ceil(total / perPage);
    
    return {
      data,
      pagination: {
        currentPage: page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Execute raw SQL with pagination
  static async paginateRaw(sql, countSql, params = [], options = {}) {
    const {
      page = 1,
      perPage = 10
    } = options;
    
    const offset = (page - 1) * perPage;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const paginatedParams = [...params, perPage, offset];
    
    const [data, countResult] = await Promise.all([
      query(paginatedSql, paginatedParams),
      query(countSql, params)
    ]);
    
    const total = parseInt(countResult[0].count);
    const totalPages = Math.ceil(total / perPage);
    
    return {
      data,
      pagination: {
        currentPage: page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
}

module.exports = DBUtils;