import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const lookup = z.object({
  usage: z.string(),
  bookId: z.string(),
  seenAt: z.iso.datetime(),
  pos: z.string().nullable(),
});

const words = defineCollection({
  loader: file("data/processed/words.json"),
  schema: z.object({
    id: z.string(),
    word: z.string(),
    stem: z.string(),
    lang: z.string(),
    firstSeenAt: z.iso.datetime(),
    lastSeenAt: z.iso.datetime(),
    primaryBookId: z.string(),
    lookups: z.array(lookup).nonempty(),
  }),
});

const books = defineCollection({
  loader: file("data/processed/books.json"),
  schema: z.object({
    id: z.string(),
    asin: z.string().nullable(),
    title: z.string(),
    authors: z.string(),
    lang: z.string(),
    wordCount: z.number().int().nonnegative(),
  }),
});

export const collections = { words, books };
