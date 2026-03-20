function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const HANOI_KEYS = ['ha noi', 'hanoi', 'hn'];
const NEAR_HANOI_PROVINCES = [
  'bac ninh',
  'hung yen',
  'vinh phuc',
  'ha nam',
  'hai duong',
  'hai phong',
  'thai nguyen',
  'phu tho',
  'nam dinh',
  'ninh binh',
  'quang ninh',
  'bac giang',
  'hoa binh',
];

function detectZoneVN(address) {
  const a = normalize(address);
  if (!a) return 'unknown';
  if (HANOI_KEYS.some((k) => a.includes(k))) return 'hanoi';
  if (NEAR_HANOI_PROVINCES.some((p) => a.includes(p))) return 'near_hanoi';
  return 'unsupported';
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function geocodeIsHanoi(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const u = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    u.searchParams.set('address', String(address || ''));
    u.searchParams.set('key', key);
    u.searchParams.set('language', 'vi');
    const r = await fetch(u.toString());
    const j = await r.json();
    const result = j?.results?.[0];
    const comps = result?.address_components || [];
    const admin1 = comps.find((c) => (c.types || []).includes('administrative_area_level_1'));
    const admin1Name = admin1?.long_name || '';
    const n = normalize(admin1Name);
    if (!n) return false;
    return n.includes('ha noi') || n.includes('hanoi') || n.includes('hà nội') || n.includes('Hà Nội') || n.includes('Ha Noi') || n.includes('hanoi');
  } catch (_) {
    return null;
  }
}

async function calcShippingFeeVnd(address) {
  const ggIsHn = await geocodeIsHanoi(address);
  if (ggIsHn === true) return { zone: 'hanoi', fee_vnd: 0, source: 'google' };
  if (ggIsHn === false) {
    // Not Hanoi per Google -> decide near-hanoi by keyword list
    const zone = detectZoneVN(address);
    if (zone === 'near_hanoi') return { zone, fee_vnd: randomInt(40000, 50000), source: 'google+keyword' };
    return { zone: 'unsupported', fee_vnd: null, source: 'google' };
  }

  // Fallback (no key or failed request)
  const zone = detectZoneVN(address);
  if (zone === 'hanoi') return { zone, fee_vnd: 0, source: 'keyword' };
  if (zone === 'near_hanoi') return { zone, fee_vnd: randomInt(40000, 50000), source: 'keyword' };
  return { zone, fee_vnd: null, source: 'keyword' };
}

module.exports = { calcShippingFeeVnd, detectZoneVN };

