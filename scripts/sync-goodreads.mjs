#!/usr/bin/env node
// Pull Jonathan's Goodreads shelves into src/data/goodreads.json.
// No dependencies — native fetch + regex parsing of the public RSS feed.
//
// Usage:  npm run sync:books
// Override the user with GOODREADS_USER_ID=12345 npm run sync:books

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_ID = process.env.GOODREADS_USER_ID || '184402283';
const SHELVES = ['currently-reading', 'read', 'to-read'];
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(REPO_ROOT, 'src', 'data', 'goodreads.json');

const decodeXml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

const stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const field = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
  return m ? decodeXml(m[1]).trim() : '';
};

async function fetchShelf(shelf) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=${encodeURIComponent(shelf)}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'learning-books-sync/1.0' } });
    if (!res.ok) throw new Error(`${shelf} p${page}: HTTP ${res.status}`);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    if (items.length === 0) break;
    for (const block of items) {
      out.push({
        id: field(block, 'book_id'),
        t: field(block, 'title'),
        a: field(block, 'author_name').replace(/\s+/g, ' '),
        y: field(block, 'book_published'),
        rating: Number(field(block, 'user_rating')) || 0,
        avg: Number(field(block, 'average_rating')) || 0,
        read_at: field(block, 'user_read_at'),
        review: stripHtml(field(block, 'user_review')).slice(0, 400),
      });
    }
    if (items.length < 100) break;
  }
  return out;
}

const data = {
  user_id: USER_ID,
  fetched_at: new Date().toISOString(),
  shelves: {},
};

for (const shelf of SHELVES) {
  process.stderr.write(`  ${shelf}...`);
  try {
    data.shelves[shelf] = await fetchShelf(shelf);
    process.stderr.write(` ${data.shelves[shelf].length}\n`);
  } catch (err) {
    process.stderr.write(` FAILED: ${err.message}\n`);
    data.shelves[shelf] = [];
  }
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
process.stderr.write(`wrote ${OUT_PATH}\n`);
