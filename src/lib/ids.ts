// Branded ID types prevent passing a book id where a quote id (or word id)
// is expected — a class of bug that would otherwise silently corrupt
// press-state keys and share filenames.
// See plan insight T-2.

export type BookId = string & { readonly __brand: "BookId" };
export type QuoteId = string & { readonly __brand: "QuoteId" };
export type WordId = string & { readonly __brand: "WordId" };

export function asBookId(s: string): BookId {
  return s as BookId;
}

export function asQuoteId(s: string): QuoteId {
  return s as QuoteId;
}

export function asWordId(s: string): WordId {
  return s as WordId;
}
