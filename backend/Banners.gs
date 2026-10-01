/**
 * Banners.gs — banner hero / promo / collection.
 */

function getBanners(position) {
  const all = withCache_('banners_all', function () {
    return getSheetData(SHEETS.BANNERS)
      .filter(function (b) { return b.is_active; })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
  });
  return position ? all.filter(function (b) { return b.position === position; }) : all;
}
