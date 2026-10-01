/**
 * Banners.gs — banner hero / promo / collection.
 */

function getBanners(position) {
  const all = withCache_('banners_all', function () {
    return getSheetData(SHEETS.BANNERS)
      .filter(function (b) { return b.is_active; })
      .map(function (b) {
        return Object.assign(b, { image: normalizeImageUrl_(b.image), image_mobile: normalizeImageUrl_(b.image_mobile) });
      })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
  });
  return position ? all.filter(function (b) { return b.position === position; }) : all;
}
