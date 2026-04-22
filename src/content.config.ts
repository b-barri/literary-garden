import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { wordSchema, bookSchema, quoteSchema } from "./lib/schemas.js";

const words = defineCollection({
  loader: file("data/processed/words.json"),
  schema: wordSchema,
});

const books = defineCollection({
  loader: file("data/processed/books.json"),
  schema: bookSchema,
});

const quotes = defineCollection({
  loader: file("data/processed/quotes.json"),
  schema: quoteSchema,
});

export const collections = { words, books, quotes };
