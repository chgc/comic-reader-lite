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

