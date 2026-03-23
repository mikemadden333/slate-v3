import type { VercelRequest, VercelResponse } from "@vercel/node";

const FEEDS = [
  { name: "Block Club Chicago", url: "https://blockclubchicago.org/feed/", color: "#B79145" },
  { name: "NBC Chicago", url: "https://www.nbcchicago.com/feed/", color: "#6B8CAE" },
  { name: "WGN News", url: "https://wgntv.com/feed/", color: "#7A9E7E" },
  { name: "Chalkbeat Chicago", url: "https://www.chalkbeat.org/arc/outboundfeeds/rss/", color: "#E07B4F" },
];

const KEYWORDS = [
  "chicago", "south side", "west side", "loop", "englewood", "woodlawn",
  "auburn gresham", "roseland", "chatham", "austin", "lawndale",
  "garfield park", "humboldt park", "charter", "cps", "school",
  "student", "education", "shooting", "crime", "arrest", "fire",
  "police", "violence", "weather",
];

function extractTag(block: string, tag: string): string {
  // Try CDATA first
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return cdata[1].trim();
  // Plain tag
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (plain) return plain[1].trim();
  return "";
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;/g, " ");
}
function extractLink(block: string): string {
  // Try <link> tag content first
  const plain = block.match(/<link>([^<]+)<\/link>/i);
  if (plain) return plain[1].trim();
  // Try self-closing or atom link
  const atom = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atom) return atom[1].trim();
  return "";
}

function parseItems(xml: string, name: string, color: string) {
  const items: {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    sourceColor: string;
  }[] = [];

  // Split on <item> boundaries
  // Handle both RSS (<item>) and Atom (<entry>) formats
  const isAtom = xml.includes("<entry");
  const parts = isAtom ? xml.split(/<entry[\s>]/i) : xml.split(/<item[\s>]/i);
  // Skip first part (it's the channel header)
  for (let i = 1; i < parts.length; i++) {
    const block = isAtom ? parts[i].split(/<\/entry>/i)[0] : parts[i].split(/<\/item>/i)[0];
    const title = extractTag(block, "title");
    const link = extractLink(block);
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "published");
    if (title && link) {
      items.push({ title: decodeEntities(title), link, pubDate, source: name, sourceColor: color });
    }
  }

  return items;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120");

  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const r = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SlateBot/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
          },
        });
        if (!r.ok) return [];
        const xml = await r.text();
        return parseItems(xml, feed.name, feed.color);
      })
    );

    let all: ReturnType<typeof parseItems> = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") all = [...all, ...r.value];
    });

    // Filter by keywords
    const filtered = all.filter((i) =>
      KEYWORDS.some((kw) => i.title.toLowerCase().includes(kw))
    );

    // Fall back to all items if filter returns nothing
    const final = (filtered.length > 0 ? filtered : all)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 10);

    res.json({ items: final, debug: { total: all.length, filtered: filtered.length } });
  } catch (e) {
    res.status(500).json({ error: String(e), items: [] });
  }
}
