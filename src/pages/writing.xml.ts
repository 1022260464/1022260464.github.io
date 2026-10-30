import { getCollection } from "astro:content";
import { site } from "../lib/site";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );

export async function GET() {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  const siteUrl = new URL(site.url);
  const items = posts
    .map((post) => {
      const url = new URL(`/writing/${post.id}/`, siteUrl).toString();
      return `
        <item>
          <title>${escapeXml(post.data.title)}</title>
          <link>${url}</link>
          <guid>${url}</guid>
          <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
          <description>${escapeXml(post.data.description ?? "")}</description>
        </item>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>${escapeXml(site.title)}</title>
        <link>${siteUrl.toString()}</link>
        <description>${escapeXml(site.description)}</description>
        <language>zh-CN</language>${items}
      </channel>
    </rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    },
  );
}
