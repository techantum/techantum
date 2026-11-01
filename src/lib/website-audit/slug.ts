/** Public URL key for an audit. Uses the audit name, not the database id. */
export function auditNameSlug(name: string) {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'audit'
}

export function auditPublicPath(row: { slug?: string | null; audit_name?: string | null }) {
  const slug = String(row?.slug || '').trim() || auditNameSlug(String(row?.audit_name || ''))
  return `/admin/website-audit/${slug}`
}
