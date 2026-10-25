export function joinRequestGroup(slug: string): 'salesRequests' | 'courierRequests' | 'joinRequests' {
  if (slug === 'company-sale' || slug === 'company-sale-executive') return 'salesRequests';
  if (slug === 'courier-internal' || slug === 'courier-external') return 'courierRequests';
  return 'joinRequests';
}
