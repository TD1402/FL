/**
 * Categories.gs — danh mục dạng cây (parent_id).
 */

function getActiveCategories_() {
  return withCache_('categories_all', function () {
    return getSheetData(SHEETS.CATEGORIES)
      .filter(function (c) { return c.is_active; })
      .map(function (c) { return Object.assign(c, { image: normalizeImageUrl_(c.image) }); })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
  });
}

/** Cây danh mục: [{...root, children: [...]}] */
function getCategoryTree() {
  const list = getActiveCategories_().map(function (c) {
    return Object.assign({}, c, { children: [] });
  });
  const byId = {};
  list.forEach(function (c) { byId[c.id] = c; });
  const roots = [];
  list.forEach(function (c) {
    if (c.parent_id && byId[c.parent_id]) byId[c.parent_id].children.push(c);
    else roots.push(c);
  });
  return roots;
}

/** id của danh mục theo slug + toàn bộ con cháu. */
function getCategoryIdsWithDescendants_(slug) {
  const list = getActiveCategories_();
  const root = list.find(function (c) { return c.slug === slug; });
  if (!root) return [];
  const ids = [root.id];
  for (let i = 0; i < ids.length; i++) {
    list.forEach(function (c) {
      if (String(c.parent_id) === String(ids[i]) && ids.indexOf(c.id) < 0) ids.push(c.id);
    });
  }
  return ids;
}
