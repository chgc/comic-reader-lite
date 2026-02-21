import { Injectable } from '@angular/core';
import { Comic, ReadingProgress } from './models';

const LIBRARY_KEY = 'eightcomic.library.v1';
const PROGRESS_KEY = 'eightcomic.progress.v1';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadLibrary(): Comic[] {
    return this.load<Comic[]>(LIBRARY_KEY, []);
  }

  saveLibrary(comics: Comic[]): void {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(comics));
  }

  loadProgressMap(): Record<string, ReadingProgress> {
    return this.load<Record<string, ReadingProgress>>(PROGRESS_KEY, {});
  }

  saveProgress(progress: ReadingProgress): void {
    const map = this.loadProgressMap();
    map[progress.comicId] = progress;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  }

  private load<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Failed to parse localStorage key: ${key}`, error);
      return fallback;
    }
  }
}

