/** Bỏ dấu tiếng Việt, chuyển chữ thường: "Cà chua Đà Lạt" -> "ca chua da lat". */
export function normalizeVi(input = '') {
  return String(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(input = '') {
  return (
    normalizeVi(input)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Tạo slug chưa tồn tại trong collection (thêm hậu tố -2, -3...). */
export async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base);
  let slug = root;
  for (let i = 2; ; i += 1) {
    const filter = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Model.exists(filter);
    if (!exists) return slug;
    slug = `${root}-${i}`;
  }
}
