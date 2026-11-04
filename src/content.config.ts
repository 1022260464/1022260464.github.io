import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default("未分类"),
    parent: z.string().optional(),
    order: z.number().int().default(0),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

const shares = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/shares" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.string().default("个人分享"),
    href: z.string().optional(),
    external: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    parent: z.string().optional(),
    order: z.number().int().default(0),
    lookbook: z.boolean().optional(),
    lookbookOrder: z.number().int().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, shares };
