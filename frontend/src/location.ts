import type { Company } from './types';

// Where the company is: the link opens the place in Google Maps (the app on a phone), and the embed shows a pin on the
// exact coordinates without needing an API key. Without coordinates the address text is searched instead.
const coordinates = (company: Company) => /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(company.mapLocation || '') ? company.mapLocation.replace(/\s+/g, '') : '';

export function mapLink(company: Company) {
  if (company.mapUrl?.trim()) return company.mapUrl.trim();
  const query = coordinates(company) || company.headquarters;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapEmbed(company: Company) {
  const query = coordinates(company) || company.headquarters;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=ar&z=17&output=embed`;
}
