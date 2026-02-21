export interface Comic {
  id: string;
  title: string;
  chapter: string;
  addedAt: string;
}

export interface ReadingProgress {
  comicId: string;
  chapter: string;
  pageIndex: number;
  updatedAt: string;
}

export interface PagesResponse {
  comicId: string;
  chapter: string;
  pages: string[];
}

export interface ChapterItem {
  id: string;
  title: string;
}

export interface ChaptersResponse {
  comicId: string;
  chapters: ChapterItem[];
}

export interface ComicMetaResponse {
  comicId: string;
  title?: string;
  author?: string;
  description?: string;
  coverImageUrl?: string;
  seriesStatus?: string;
  chapterRange?: string;
  updatedDate?: string;
  category?: string;
  ratingSummary?: string;
  heatText?: string;
  sourceUrl?: string;
}

