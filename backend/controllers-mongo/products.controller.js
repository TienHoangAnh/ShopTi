const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

function categoryIdFromBody(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (mongoose.isValidObjectId(s)) return s;
  return null;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstQueryParam(v) {
  if (v == null) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

function extractProductLine(name) {
  const s = firstQueryParam(name).trim();
  if (!s) return '';
  const m = s.match(/^(.+?\d+)(?:\s|$)/);
  if (m && m[1]) return m[1].trim();
  return s.split(/\s+/).slice(0, 1).join(' ').trim();
}

function tokenizeNameKeywords(name) {
  const s = firstQueryParam(name).toLowerCase();
  const parts = s.match(/[a-z0-9\u00C0-\u1EF9]+/gi) || [];
  const stop = new Set(['toi', 'ban', 'mua', 'va', 'the', 'for']);
  return [...new Set(parts.map((x) => x.trim()).filter((x) => x.length >= 2 && !stop.has(x)))];
}

function toObjectIds(idSet) {
  return [...idSet].filter((x) => mongoose.isValidObjectId(x)).map((x) => new mongoose.Types.ObjectId(x));
}

function excludeObjectIdNeClause(exclude_id) {
  const s = firstQueryParam(exclude_id).trim();
  if (!s || !mongoose.isValidObjectId(s)) return null;
  try {
    return { _id: { $ne: new mongoose.Types.ObjectId(s) } };
  } catch {
    return null;
  }
}

function productToOut(p) {
  const sizes =
    Array.isArray(p.sizes) && p.sizes.length
      ? p.sizes
      : p.size
        ? String(p.size)
            .split(/[,/|]/)
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    price: p.price,
    image_url: p.image_url,
    stock: p.stock,
    category_id: p.category ? p.category._id.toString() : null,
    category_name: p.category?.name || null,
    brand: p.brand || null,
    sizes,
    size: sizes.length ? sizes.join(', ') : p.size,
    color: p.color,
    created_at: p.createdAt,
  };
}

/** Danh sách đầy đủ cho trang admin */
async function adminListAll(req, res) {
  const products = await Product.find({})
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, products: products.map(productToOut) });
}

/** GET /api/products/filters — phải khai báo route trước /:id */
async function filters(req, res) {
  try {
    const [categories, brandDocs, colorDocs, sizeRows] = await Promise.all([
      Category.find().sort({ name: 1 }).select('_id name').lean(),
      Product.distinct('brand', { brand: { $nin: [null, ''] } }),
      Product.distinct('color', { color: { $nin: [null, ''] } }),
      Product.find().select('sizes size size_tags').lean(),
    ]);
    const catOut = categories.map((c) => ({ id: c._id.toString(), name: c.name }));
    const sizeSet = new Set();
    (sizeRows || []).forEach((p) => {
      (p.sizes || []).forEach((s) => {
        if (s) sizeSet.add(String(s).trim());
      });
      if (p.size_tags) {
        String(p.size_tags)
          .split('|')
          .forEach((s) => {
            const t = String(s).trim();
            if (t) sizeSet.add(t);
          });
      }
      if (p.size) {
        String(p.size)
          .split(/[,/|]/)
          .forEach((s) => {
            const t = s.trim();
            if (t) sizeSet.add(t);
          });
      }
    });
    res.json({
      success: true,
      filters: {
        categories: catOut,
        sizes: [...sizeSet].sort(),
        brands: (brandDocs || []).filter(Boolean).sort(),
        colors: (colorDocs || []).filter(Boolean).sort(),
      },
    });
  } catch (err) {
    console.error('Error loading product filters', err);
    res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
}

async function list(req, res) {
  const {
    search,
    category_id,
    brand,
    brand_exact,
    recommend,
    suggest,
    match_brand,
    match_name,
    size,
    color,
    min_price,
    max_price,
    exclude_id,
    limit_line = 8,
    limit_brand = 12,
    limit = 50,
    offset = 0,
  } = req.query || {};

  const skip = Math.max(0, parseInt(offset, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  if (recommend === '1' || recommend === 'true') {
    const ex = excludeObjectIdNeClause(exclude_id);
    const categoryId = firstQueryParam(req.query.match_category_id).trim();
    const brandName = firstQueryParam(match_brand).trim();
    const nameTokens = tokenizeNameKeywords(match_name);
    const categoryLimit = Math.min(40, Math.max(1, parseInt(req.query.limit_category, 10) || 8));
    const nameLimit = Math.min(60, Math.max(1, parseInt(req.query.limit_name, 10) || 12));
    const brandLimit = Math.min(40, Math.max(1, parseInt(limit_brand, 10) || 8));
    const usedIds = new Set();
    if (ex && ex._id && ex._id.$ne) usedIds.add(String(ex._id.$ne));

    let sameCategoryOut = [];
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      const categoryFilter = { category: new mongoose.Types.ObjectId(categoryId) };
      if (ex) Object.assign(categoryFilter, ex);
      const sameCategory = await Product.find(categoryFilter)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(categoryLimit)
        .lean();
      sameCategoryOut = sameCategory
        .filter((p) => {
          const id = String(p._id);
          if (usedIds.has(id)) return false;
          usedIds.add(id);
          return true;
        })
        .map(productToOut);
    }

    let sameNameOut = [];
    if (nameTokens.length) {
      const nameAnd = [{ $or: nameTokens.map((t) => ({ name: new RegExp(escapeRegex(t), 'i') })) }];
      if (ex) nameAnd.push(ex);
      if (usedIds.size) nameAnd.push({ _id: { $nin: toObjectIds(usedIds) } });
      const sameName = await Product.find({ $and: nameAnd })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(nameLimit)
        .lean();
      sameNameOut = sameName
        .filter((p) => {
          const id = String(p._id);
          if (usedIds.has(id)) return false;
          usedIds.add(id);
          return true;
        })
        .map(productToOut);
    }

    let sameBrandOut = [];
    if (brandName) {
      const brandAnd = [{ brand: new RegExp(`^${escapeRegex(brandName)}$`, 'i') }];
      if (ex) brandAnd.push(ex);
      if (usedIds.size) brandAnd.push({ _id: { $nin: toObjectIds(usedIds) } });
      const sameBrand = await Product.find({ $and: brandAnd })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(brandLimit)
        .lean();
      sameBrandOut = sameBrand
        .filter((p) => {
          const id = String(p._id);
          if (usedIds.has(id)) return false;
          usedIds.add(id);
          return true;
        })
        .map(productToOut);
    }

    return res.json({
      success: true,
      recommendations: {
        same_category: sameCategoryOut,
        same_name: sameNameOut,
        same_brand: sameBrandOut,
      },
    });
  }

  if (suggest === '1' || suggest === 'true') {
    const orRelated = [];
    const mb = firstQueryParam(match_brand).trim();
    const mn = firstQueryParam(match_name).trim();
    if (mb) orRelated.push({ brand: new RegExp(`^${escapeRegex(mb)}$`, 'i') });
    // Không neo đầu/cuối để match "iPhone 15" với "iPhone 15 Pro Max..."
    if (mn) orRelated.push({ name: new RegExp(escapeRegex(mn), 'i') });
    if (!orRelated.length) {
      return res.json({ success: true, products: [], total: 0 });
    }
    const andChain = [{ $or: orRelated }];
    const ex = excludeObjectIdNeClause(exclude_id);
    if (ex) andChain.push(ex);
    const filterSuggest = { $and: andChain };
    const products = await Product.find(filterSuggest)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    const total = await Product.countDocuments(filterSuggest);
    return res.json({ success: true, products: products.map(productToOut), total });
  }

  const filter = {};
  const andParts = [];
  if (search) {
    andParts.push({
      $or: [
        { name: new RegExp(escapeRegex(search), 'i') },
        { description: new RegExp(escapeRegex(search), 'i') },
        { brand: new RegExp(escapeRegex(search), 'i') },
      ],
    });
  }
  if (category_id) filter.category = category_id;
  if (brand) {
    const b = String(brand).trim();
    if (brand_exact === '1' || brand_exact === 'true') {
      filter.brand = new RegExp(`^${escapeRegex(b)}$`, 'i');
    } else {
      filter.brand = new RegExp(escapeRegex(b), 'i');
    }
  }
  const excludeNe = excludeObjectIdNeClause(exclude_id);
  if (excludeNe) {
    if (andParts.length) andParts.push(excludeNe);
    else Object.assign(filter, excludeNe);
  }
  if (size) {
    const s = String(size);
    andParts.push({
      $or: [{ sizes: s }, { size_tags: new RegExp(`(^|\\|)${escapeRegex(s)}(\\||$)`) }, { size: new RegExp(escapeRegex(s), 'i') }],
    });
  }
  if (andParts.length) filter.$and = andParts;
  if (color) filter.color = new RegExp(escapeRegex(color), 'i');
  if ((min_price != null && min_price !== '') || (max_price != null && max_price !== '')) {
    filter.price = {};
    if (min_price != null && min_price !== '') filter.price.$gte = parseFloat(min_price);
    if (max_price != null && max_price !== '') filter.price.$lte = parseFloat(max_price);
  }

  const products = await Product.find(filter)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();
  const total = await Product.countDocuments(filter);

  res.json({ success: true, products: products.map(productToOut), total });
}

async function getOne(req, res) {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const p = await Product.findById(id).populate('category', 'name').lean();
  if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product: productToOut(p) });
}

async function create(req, res) {
  const { name, description, price, image_url, stock, category_id, color, brand } = req.body || {};
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: 'name and price required' });
  }
  const sizes =
    Array.isArray(req.body?.sizes) ? req.body.sizes.map((x) => String(x).trim()).filter(Boolean) : [];
  const size = req.body?.size != null ? String(req.body.size).trim() : null;
  const size_tags = sizes.length ? sizes.join('|') : null;

  const created = await Product.create({
    name,
    description: description || '',
    price: parseFloat(price),
    image_url: image_url || '/images/placeholder.svg',
    stock: stock != null ? parseInt(stock, 10) || 0 : 0,
    category: categoryIdFromBody(category_id),
    sizes,
    size_tags,
    size: size || null,
    color: color && String(color).trim() ? String(color).trim() : null,
    brand: brand != null && String(brand).trim() ? String(brand).trim() : null,
  });

  const out = await Product.findById(created._id).populate('category', 'name').lean();
  res.status(201).json({ success: true, product: productToOut(out) });
}

async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const existing = await Product.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

  const patch = {};
  const { name, description, price, image_url, stock, category_id, color, brand } = req.body || {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (price !== undefined) patch.price = parseFloat(price);
  if (image_url !== undefined) patch.image_url = image_url;
  if (stock !== undefined) patch.stock = parseInt(stock, 10);
  if (category_id !== undefined) patch.category = categoryIdFromBody(category_id);
  if (color !== undefined) patch.color = color && String(color).trim() ? String(color).trim() : null;
  if (brand !== undefined) patch.brand = brand != null && String(brand).trim() ? String(brand).trim() : null;

  const hasSizesUpdate = req.body?.sizes !== undefined || req.body?.size !== undefined;
  if (hasSizesUpdate) {
    const sizes = Array.isArray(req.body?.sizes) ? req.body.sizes.map((x) => String(x).trim()).filter(Boolean) : [];
    const size = req.body?.size != null ? String(req.body.size).trim() : null;
    patch.sizes = sizes;
    patch.size = size || null;
    patch.size_tags = sizes.length ? sizes.join('|') : null;
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, patch, { new: true })
    .populate('category', 'name')
    .lean();
  res.json({ success: true, product: productToOut(updated) });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const deleted = await Product.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
}

module.exports = { adminListAll, filters, list, getOne, create, update, remove };

