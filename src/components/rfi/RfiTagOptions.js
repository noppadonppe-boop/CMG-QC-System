export const TAG_SYNC_GROUPS = [
  { key: 'building-isb', label: 'Building ISB', column: 'D', range: 'D2:D' },
  { key: 'building-gis', label: 'Building GIS', column: 'J', range: 'J2:J' },
  { key: 'lng-truck-loading', label: 'LNG Truck Loading', column: 'P', range: 'P2:P' },
  { key: 'guard-house', label: 'Guard House', column: 'V', range: 'V2:V' },
];

export function splitTagIds(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/[,\n;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getTagOptionGroupKey(option) {
  if (option?.syncGroupKey) return option.syncGroupKey;
  return TAG_SYNC_GROUPS.find((group) => group.range === option?.range)?.key || '';
}
