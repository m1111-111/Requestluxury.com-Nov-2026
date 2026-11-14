import { XMLParser } from 'fast-xml-parser';
import type { CurrencyCode, ListingInput, PropertyStatus, Rates, Specs, Vertical } from '@/types';
import { FALLBACK_RATES, getVertical, isCurrency, isVertical } from './constants';
import { formatNumber } from './format';
import { cleanText, isHttpsUrl, toNumber } from './validation';

export interface RejectedRow {
  row: number;
  title: string;
  reason: string;
}

export interface ImportResult {
  valid: ListingInput[];
  rejected: RejectedRow[];
}

export interface ImportOptions {
  /** Used when a row does not state its own vertical. */
  defaultVertical?: Vertical | null;
  rates?: Rates;
  maxRows?: number;
}

type RawRow = Record<string, unknown>;

const KNOWN_COLUMNS = new Set([
  'title', 'name', 'headline', 'vertical', 'category', 'type', 'description', 'desc', 'summary', 'details',
  'price', 'price_usd', 'asking_price', 'amount', 'currency', 'price_currency', 'display_currency',
  'price_on_request', 'poa', 'country', 'city', 'town', 'locality', 'location', 'address', 'exact_address', 'street',
  'property_status', 'completion_status', 'status', 'trakheesi_permit_number', 'trakheesi', 'permit', 'permit_number',
  'images', 'image', 'image_url', 'image_urls', 'photos', 'photo', 'pictures', 'picture', 'gallery',
  'video', 'video_url', 'url', 'link', 'id', 'reference', 'ref',
]);

const VERTICAL_SYNONYMS: Array<[RegExp, Vertical]> = [
  [/resid|propert|real.?estate|villa|apartment|penthouse|house|home|estate/i, 'residences'],
  [/supercar|car|auto|vehicle|motor(?!.?yacht)/i, 'supercars'],
  [/yacht|boat|marine|vessel|sail/i, 'yachts'],
  [/aviation|aircraft|jet|helicopter|plane|aero/i, 'aviation'],
  [/horolog|watch|timepiece/i, 'horology'],
  [/jewel|diamond|gem/i, 'jewelry'],
];

function text(value: unknown, max = 400): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const node = value as Record<string, unknown>;
    return text(node['#text'] ?? node.url ?? node.src ?? node.href ?? node.value ?? '', max);
  }
  return cleanText(String(value), max);
}

function first(row: RawRow, keys: string[], max = 400): string {
  for (const key of keys) {
    const value = text(row[key], max);
    if (value) return value;
  }
  return '';
}

function resolveVertical(raw: string, fallback?: Vertical | null): Vertical | null {
  const value = raw.toLowerCase().trim();
  if (isVertical(value)) return value;
  if (value) {
    for (const [pattern, vertical] of VERTICAL_SYNONYMS) if (pattern.test(value)) return vertical;
  }
  return fallback ?? null;
}

function resolvePropertyStatus(raw: string, vertical: Vertical): PropertyStatus {
  if (vertical !== 'residences') return 'not_applicable';
  const value = raw.toLowerCase();
  if (/off.?plan|under.?construction|pre.?launch/.test(value)) return 'off_plan';
  return 'ready_built';
}

function truthy(raw: string): boolean {
  return /^(true|yes|y|1|poa|on request)$/i.test(raw.trim());
}

/** Collects https image URLs from a delimited string, an array, or nested feed nodes. */
function collectImages(value: unknown, out: string[] = []): string[] {
  if (out.length >= 30 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectImages(item, out);
    return out;
  }
  if (typeof value === 'object') {
    const node = value as Record<string, unknown>;
    const direct = node['#text'] ?? node.url ?? node.src ?? node.href;
    if (direct !== undefined) return collectImages(direct, out);
    for (const child of Object.values(node)) collectImages(child, out);
    return out;
  }
  for (const part of String(value).split(/[|;\n]|,(?=\s*https?:)/)) {
    const url = part.trim();
    if (isHttpsUrl(url) && !out.includes(url) && out.length < 30) out.push(url);
  }
  return out;
}

function toUsd(amount: number, currency: string, rates: Rates): number {
  const code = currency.toUpperCase();
  if (!isCurrency(code) || code === 'USD') return amount;
  const rate = rates[code as CurrencyCode] || FALLBACK_RATES[code as CurrencyCode];
  return rate > 0 ? Math.round((amount / rate) * 100) / 100 : amount;
}

function normaliseRow(row: RawRow, index: number, options: ImportOptions): ListingInput | RejectedRow {
  const rates = options.rates ?? FALLBACK_RATES;
  const title = first(row, ['title', 'name', 'headline'], 200);
  const reject = (reason: string): RejectedRow => ({ row: index, title: title || '(untitled)', reason });

  if (title.length < 3) return reject('Missing title');

  const vertical = resolveVertical(first(row, ['vertical', 'category', 'type']), options.defaultVertical);
  if (!vertical) return reject('Unknown category: use residences, supercars, yachts, aviation, horology or jewelry');

  const description = first(row, ['description', 'desc', 'summary', 'details'], 8000);
  if (description.length < 20) return reject('Description is missing or shorter than 20 characters');

  const rawCurrency = first(row, ['currency', 'price_currency', 'display_currency']).toUpperCase();
  const displayCurrency: CurrencyCode = isCurrency(rawCurrency) ? rawCurrency : 'USD';
  const hasUsdColumn = text(row.price_usd) !== '';
  const amount = toNumber(first(row, ['price_usd', 'price', 'asking_price', 'amount']));
  if (amount === null || amount <= 0) return reject('Missing or invalid price');
  const priceUsd = hasUsdColumn ? amount : toUsd(amount, rawCurrency || 'USD', rates);

  const floor = getVertical(vertical)?.priceFloorUsd ?? 0;
  if (priceUsd < floor) {
    return reject(`Below the ${getVertical(vertical)?.label} price floor of $${formatNumber(floor)} (USD ${formatNumber(Math.round(priceUsd))})`);
  }

  const location = first(row, ['location']);
  const [locationCity, locationCountry] = location.includes(',')
    ? [location.split(',')[0].trim(), location.split(',').slice(-1)[0].trim()]
    : [location, ''];
  const city = first(row, ['city', 'town', 'locality'], 120) || locationCity;
  const country = first(row, ['country'], 120) || locationCountry;
  if (!city || !country) return reject('City and country are required');

  const permit = first(row, ['trakheesi_permit_number', 'trakheesi', 'permit_number', 'permit'], 60);
  if (vertical === 'residences' && city.trim().toLowerCase() === 'dubai' && !permit) {
    return reject('Dubai residences require a Trakheesi permit number');
  }

  const images = collectImages(
    row.images ?? row.image_urls ?? row.image_url ?? row.image ?? row.photos ?? row.photo ?? row.pictures ?? row.picture ?? row.gallery,
  );
  const videoUrl = first(row, ['video_url', 'video'], 500);

  const specs: Specs = {};
  for (const [key, value] of Object.entries(row)) {
    if (Object.keys(specs).length >= 30) break;
    const cleanKey = key.toLowerCase().replace(/^spec[_:]/, '').replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    if (!cleanKey || (KNOWN_COLUMNS.has(key.toLowerCase()) && !key.toLowerCase().startsWith('spec'))) continue;
    if (value === null || value === undefined || typeof value === 'object') continue;
    const stringValue = cleanText(String(value), 200);
    if (!stringValue) continue;
    const numeric = /^-?\d+(\.\d+)?$/.test(stringValue) ? Number(stringValue) : null;
    specs[cleanKey] = numeric !== null && Number.isFinite(numeric) ? numeric : stringValue;
  }

  return {
    title,
    vertical,
    description,
    price_usd: priceUsd,
    display_currency: displayCurrency,
    price_on_request: truthy(first(row, ['price_on_request', 'poa'])),
    country,
    city,
    exact_address: first(row, ['exact_address', 'address', 'street'], 300) || null,
    property_status: resolvePropertyStatus(first(row, ['property_status', 'completion_status', 'status']), vertical),
    trakheesi_permit_number: permit || null,
    images,
    video_url: isHttpsUrl(videoUrl) ? videoUrl : null,
    specs,
  };
}

function finish(rows: RawRow[], options: ImportOptions): ImportResult {
  const maxRows = options.maxRows ?? 500;
  const result: ImportResult = { valid: [], rejected: [] };
  rows.slice(0, maxRows).forEach((row, index) => {
    const outcome = normaliseRow(row, index + 1, options);
    if ('reason' in outcome) result.rejected.push(outcome);
    else result.valid.push(outcome);
  });
  if (rows.length > maxRows) {
    result.rejected.push({ row: maxRows + 1, title: '(remaining rows)', reason: `Only the first ${maxRows} rows are imported per upload` });
  }
  return result;
}

/** RFC 4180 CSV: quoted fields, escaped quotes, commas and line breaks inside quotes. */
export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  const source = input.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export function importFromCsv(csv: string, options: ImportOptions = {}): ImportResult {
  const table = parseCsvRows(csv);
  if (table.length < 2) {
    return { valid: [], rejected: [{ row: 1, title: '(file)', reason: 'The CSV needs a header row and at least one listing' }] };
  }
  const header = table[0].map((cell) => cell.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = table.slice(1).map((cells) => {
    const row: RawRow = {};
    header.forEach((column, index) => {
      if (column) row[column] = cells[index] ?? '';
    });
    return row;
  });
  return finish(rows, options);
}

/** Finds the repeating record inside any dealer feed: the largest array of objects that carry a title or name. */
function findRecords(node: unknown, depth = 0): RawRow[] {
  if (depth > 6 || node === null || typeof node !== 'object') return [];
  if (Array.isArray(node)) {
    const objects = node.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as RawRow[];
    const titled = objects.filter((item) => Object.keys(item).some((key) => ['title', 'name', 'headline'].includes(key.toLowerCase())));
    if (titled.length > 0) return titled;
    return objects.map((item) => findRecords(item, depth + 1)).reduce((best, next) => (next.length > best.length ? next : best), [] as RawRow[]);
  }
  const record = node as RawRow;
  let best: RawRow[] = [];
  for (const value of Object.values(record)) {
    const candidate = findRecords(Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : null, depth + 1);
    if (candidate.length > best.length) best = candidate;
  }
  return best;
}

export function importFromXml(xml: string, options: ImportOptions = {}): ImportResult {
  let parsed: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
      trimValues: true,
      parseTagValue: false,
      processEntities: true,
    });
    parsed = parser.parse(xml);
  } catch {
    return { valid: [], rejected: [{ row: 1, title: '(feed)', reason: 'The feed is not valid XML' }] };
  }
  const records = findRecords(parsed).map((record) => {
    const lowered: RawRow = {};
    for (const [key, value] of Object.entries(record)) lowered[key.toLowerCase().replace(/[\s-]+/g, '_')] = value;
    return lowered;
  });
  if (records.length === 0) {
    return { valid: [], rejected: [{ row: 1, title: '(feed)', reason: 'No listings found: each item needs a <title> or <name>' }] };
  }
  return finish(records, options);
}

export function importFromFile(filename: string, content: string, options: ImportOptions = {}): ImportResult {
  const looksXml = /\.xml$/i.test(filename) || content.trimStart().startsWith('<');
  return looksXml ? importFromXml(content, options) : importFromCsv(content, options);
}
