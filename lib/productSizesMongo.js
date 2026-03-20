function normalizeSizesBody(body) {
  let arr = [];
  if (Array.isArray(body.sizes)) arr = body.sizes.map(String).map((s) => s.trim()).filter(Boolean);
  if (!arr.length && body.size && String(body.size).trim()) arr = [String(body.size).trim()];
  const unique = [...new Set(arr)];
  return {
    sizes: unique,
    size_tags: unique.length ? unique.join('|') : null,
    size: unique.length === 1 ? unique[0] : unique.length > 1 ? unique.join(', ') : null,
  };
}

module.exports = { normalizeSizesBody };
