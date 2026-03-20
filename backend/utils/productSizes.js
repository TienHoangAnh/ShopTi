/**
 * Parse sizes from DB row (sizes_json + legacy size).
 */
function productSizesFromRow(row) {
  let arr = [];
  try {
    if (row.sizes_json && String(row.sizes_json).trim()) {
      const p = JSON.parse(row.sizes_json);
      if (Array.isArray(p)) arr = p.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch (e) {}
  if (!arr.length && row.size) {
    const s = String(row.size).trim();
    arr = s.split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
    if (!arr.length && s) arr = [s];
  }
  return [...new Set(arr)];
}

function normalizeSizesInput(body) {
  let sizes = [];
  if (Array.isArray(body.sizes)) {
    sizes = body.sizes.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (!sizes.length && body.size && String(body.size).trim()) {
    sizes = [String(body.size).trim()];
  }
  const unique = [...new Set(sizes)];
  return {
    sizes: unique,
    sizes_json: unique.length ? JSON.stringify(unique) : null,
    size_tags: unique.length ? unique.join('|') : null,
    size: unique.length === 1 ? unique[0] : unique.length > 1 ? unique.join(', ') : null,
  };
}

function enrichProductRow(row) {
  const sizes = productSizesFromRow(row);
  return {
    ...row,
    sizes,
    size: sizes.length ? sizes.join(', ') : row.size || null,
  };
}

module.exports = { productSizesFromRow, normalizeSizesInput, enrichProductRow };
