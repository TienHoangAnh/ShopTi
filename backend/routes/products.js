const express = require('express');
const db = require('../database/init');
const { enrichProductRow } = require('../utils/productSizes');

const router = express.Router();

// GET /api/products/filters - options for filter (categories, sizes, colors)
router.get('/filters', (req, res) => {
  try {
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
    let sizes = [];
    let colors = [];
    try {
      const sizeRows = db.prepare('SELECT size_tags, size FROM products').all();
      const set = new Set();
      for (const r of sizeRows) {
        if (r.size_tags) r.size_tags.split('|').forEach((s) => { const t = String(s).trim(); if (t) set.add(t); });
        if (r.size) String(r.size).split(/[,/|]/).forEach((s) => { const t = s.trim(); if (t) set.add(t); });
      }
      sizes = [...set].sort();
    } catch (e) {
      sizes = [];
    }
    try {
      colors = db
        .prepare('SELECT DISTINCT color FROM products WHERE color IS NOT NULL AND color != "" ORDER BY color')
        .all()
        .map((r) => r.color);
    } catch (e) {
      colors = [];
    }
    res.json({
      success: true,
      filters: {
        categories,
        sizes,
        colors,
      },
    });
  } catch (err) {
    console.error('Error loading product filters', err);
    res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
});

function firstQ(v) {
  if (v == null) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

function extractProductLine(name) {
  const s = firstQ(name).trim();
  if (!s) return '';
  const m = s.match(/^(.+?\d+)(?:\s|$)/);
  if (m && m[1]) return m[1].trim();
  return s.split(/\s+/).slice(0, 1).join(' ').trim();
}

function tokenizeNameKeywords(name) {
  const s = firstQ(name).toLowerCase();
  const parts = s.match(/[a-z0-9\u00C0-\u1EF9]+/gi) || [];
  const stop = new Set(['toi', 'ban', 'mua', 'va', 'the', 'for']);
  return [...new Set(parts.map((x) => x.trim()).filter((x) => x.length >= 2 && !stop.has(x)))];
}

// GET /api/products - list with filters: search, category_id, size, color, min_price, max_price, limit, offset
router.get('/', (req, res) => {
  const { recommend, suggest, exclude_id, match_name, match_category_id, search, category_id, size, color, min_price, max_price, limit_category = 8, limit_name = 12, limit = 50, offset = 0 } = req.query;

  if (recommend === '1' || recommend === 'true') {
    const ex = firstQ(exclude_id).trim();
    const exNum = ex ? parseInt(ex, 10) : NaN;
    const catRaw = firstQ(match_category_id).trim();
    const catNum = catRaw ? parseInt(catRaw, 10) : NaN;
    const nameTokens = tokenizeNameKeywords(match_name);
    const catLimit = Math.min(40, Math.max(1, parseInt(limit_category, 10) || 8));
    const nameLimit = Math.min(60, Math.max(1, parseInt(limit_name, 10) || 12));
    const used = new Set();
    if (!Number.isNaN(exNum)) used.add(exNum);

    const categoryWhere = [];
    const categoryParams = [];
    if (!Number.isNaN(catNum)) {
      categoryWhere.push('p.category_id = ?');
      categoryParams.push(catNum);
    }
    if (!Number.isNaN(exNum)) {
      categoryWhere.push('p.id != ?');
      categoryParams.push(exNum);
    }
    const sameCategory = categoryWhere.length
      ? db
          .prepare(
            `SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.category_id, p.size, p.color, p.created_at, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE ${categoryWhere.join(' AND ')}
             ORDER BY p.created_at DESC
             LIMIT ?`
          )
          .all(...categoryParams, catLimit)
          .map(enrichProductRow)
      : [];
    const sameCategoryOut = sameCategory.filter((p) => {
      if (used.has(p.id)) return false;
      used.add(p.id);
      return true;
    });

    const nameWhere = [];
    const nameParams = [];
    if (nameTokens.length) {
      nameWhere.push('(' + nameTokens.map(() => 'LOWER(TRIM(p.name)) LIKE LOWER(?)').join(' OR ') + ')');
      nameParams.push(...nameTokens.map((t) => `%${t}%`));
    }
    if (!Number.isNaN(exNum)) {
      nameWhere.push('p.id != ?');
      nameParams.push(exNum);
    }
    if (used.size) {
      nameWhere.push(`p.id NOT IN (${[...used].map(() => '?').join(',')})`);
      nameParams.push(...used);
    }
    const sameName = nameWhere.length
      ? db
          .prepare(
            `SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.category_id, p.size, p.color, p.created_at, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE ${nameWhere.join(' AND ')}
             ORDER BY p.created_at DESC
             LIMIT ?`
          )
          .all(...nameParams, nameLimit)
          .map(enrichProductRow)
      : [];
    const sameNameOut = sameName.filter((p) => {
      if (used.has(p.id)) return false;
      used.add(p.id);
      return true;
    });

    const sameBrandOut = [];
    return res.json({
      success: true,
      recommendations: {
        same_category: sameCategoryOut,
        same_name: sameNameOut,
        same_brand: sameBrandOut,
      },
    });
  }

  /** Gợi ý trang detail (SQLite: cùng tên chính xác + loại id; chưa có cột brand trong schema) */
  if (suggest === '1' || suggest === 'true') {
    const ex = firstQ(exclude_id).trim();
    const exNum = ex ? parseInt(ex, 10) : NaN;
    const mn = firstQ(match_name).trim();
    const orParts = [];
    const params = [];
    if (mn) {
      orParts.push('LOWER(TRIM(p.name)) LIKE LOWER(?)');
      params.push(`%${mn}%`);
    }
    if (!orParts.length) {
      return res.json({ success: true, products: [], total: 0 });
    }
    let where = '(' + orParts.join(' OR ') + ')';
    if (!Number.isNaN(exNum)) {
      where = 'p.id != ? AND ' + where;
      params.unshift(exNum);
    }
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const off = Math.max(0, parseInt(offset, 10));
    const baseFrom = `
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
    `;
    const listSql = `SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.category_id, p.size, p.color, p.created_at, c.name AS category_name ${baseFrom} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    const products = db.prepare(listSql).all(...params, lim, off).map(enrichProductRow);
    const total = db.prepare(`SELECT COUNT(*) as total ${baseFrom}`).get(...params).total;
    return res.json({ success: true, products, total });
  }

  let sql = `
    SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.category_id, p.size, p.color, p.created_at,
           c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }
  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (size) {
    sql += " AND (instr('|' || coalesce(p.size_tags,'') || '|', '|' || ? || '|') > 0 OR p.size = ? OR p.size LIKE ? OR p.size LIKE ? OR p.size LIKE ?)";
    const s = String(size);
    params.push(s, s, `${s},%`, `%, ${s}`, `%, ${s},%`);
  }
  if (color) {
    sql += ' AND (p.color = ? OR p.color LIKE ?)';
    params.push(color, `%${color}%`);
  }
  if (min_price != null && min_price !== '') {
    sql += ' AND p.price >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price != null && max_price !== '') {
    sql += ' AND p.price <= ?';
    params.push(parseFloat(max_price));
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));
  const products = db.prepare(sql).all(...params).map(enrichProductRow);

  let countSql = 'SELECT COUNT(*) as total FROM products p WHERE 1=1';
  const countParams = [];
  if (search) { countSql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }
  if (category_id) { countSql += ' AND p.category_id = ?'; countParams.push(category_id); }
  if (size) {
    countSql += " AND (instr('|' || coalesce(p.size_tags,'') || '|', '|' || ? || '|') > 0 OR p.size = ? OR p.size LIKE ? OR p.size LIKE ? OR p.size LIKE ?)";
    const s = String(size);
    countParams.push(s, s, `${s},%`, `%, ${s}`, `%, ${s},%`);
  }
  if (color) { countSql += ' AND (p.color = ? OR p.color LIKE ?)'; countParams.push(color, `%${color}%`); }
  if (min_price != null && min_price !== '') { countSql += ' AND p.price >= ?'; countParams.push(parseFloat(min_price)); }
  if (max_price != null && max_price !== '') { countSql += ' AND p.price <= ?'; countParams.push(parseFloat(max_price)); }
  const countRow = db.prepare(countSql).get(...countParams);

  res.json({ success: true, products, total: countRow.total });
});

// GET /api/products/:id - single product (with category name)
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.category_id, p.size, p.color, p.created_at,
           c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product: enrichProductRow(product) });
});

module.exports = router;
