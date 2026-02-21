import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComicProviderService, ProviderMode } from './comic-provider.service';
import { ChapterItem, Comic, ReadingProgress } from './models';
import { StorageService } from './storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="layout" (window:keydown)="onKey($event)">
      <section class="panel">
        <h1>8comic 乾淨版瀏覽器</h1>
        <form class="add-form" (ngSubmit)="addComic()">
          <input [(ngModel)]="newComicId" name="comicId" placeholder="漫畫 ID" required />
          <input [(ngModel)]="newComicTitle" name="comicTitle" placeholder="漫畫名稱" required />
          <button type="button" (click)="fetchDraftChapters()" [disabled]="!newComicId.trim()">取得章節</button>
          <select [(ngModel)]="newChapter" name="chapter">
            <option *ngFor="let c of draftChapters" [value]="c.id">{{ c.id }} - {{ c.title }}</option>
          </select>
          <input *ngIf="draftChapters.length === 0" [(ngModel)]="newChapter" name="chapterInput" placeholder="章節" required />
          <button type="submit">加入</button>
        </form>
        <p *ngIf="chapterError" class="error">{{ chapterError }}</p>

        <div class="provider-row">
          <label>來源</label>
          <select [(ngModel)]="provider" name="provider">
            <option value="8comic">8comic</option>
          </select>
        </div>
        <input
          *ngIf="provider === '8comic'"
          [(ngModel)]="sourceUrl"
          name="sourceUrl"
          placeholder="可選：覆寫章節 URL"
        />
        <input
          *ngIf="provider === '8comic'"
          [(ngModel)]="sourceReferer"
          name="sourceReferer"
          placeholder="可選：覆寫 Referer"
        />

        <ul class="comic-list">
          <li *ngFor="let comic of comics">
            <button (click)="openComic(comic)">{{ comic.title }} ({{ comic.id }})</button>
            <span>ch{{ comic.chapter }}</span>
            <button class="danger" (click)="removeComic(comic.id)">移除</button>
          </li>
        </ul>
      </section>

      <section class="reader" *ngIf="currentComic">
        <h2>{{ currentComic.title }} - ch{{ currentChapter }}</h2>
        <p *ngIf="error" class="error">{{ error }}</p>
        <p *ngIf="loading">載入中...</p>
        <img *ngIf="!loading && currentImage" [src]="currentImage" alt="comic page" />
        <div class="controls">
          <button (click)="prevPage()" [disabled]="currentPageIndex <= 0">上一頁</button>
          <span>{{ currentPageIndex + 1 }} / {{ pages.length || 0 }}</span>
          <button (click)="nextPage()" [disabled]="currentPageIndex >= pages.length - 1">下一頁</button>
        </div>
      </section>
    </main>
  `,
})
export class AppComponent {
  comics: Comic[] = [];
  progressMap: Record<string, ReadingProgress> = {};

  provider: ProviderMode = '8comic';
  sourceUrl = '';
  sourceReferer = '';
  draftChapters: ChapterItem[] = [];
  chapterError = '';

  newComicId = '';
  newComicTitle = '';
  newChapter = '1';

  currentComic?: Comic;
  currentChapter = '1';
  pages: string[] = [];
  currentPageIndex = 0;
  loading = false;
  error = '';

  constructor(
    private readonly storage: StorageService,
    private readonly providerService: ComicProviderService,
  ) {
    this.comics = storage.loadLibrary();
    this.progressMap = storage.loadProgressMap();
  }

  get currentImage(): string {
    return this.pages[this.currentPageIndex] ?? '';
  }

  addComic(): void {
    const chapter = this.newChapter.trim() || this.draftChapters[0]?.id || '1';
    const comic: Comic = {
      id: this.newComicId.trim(),
      title: this.newComicTitle.trim(),
      chapter,
      addedAt: new Date().toISOString(),
    };
    if (!comic.id || !comic.title || !comic.chapter) {
      return;
    }
    this.comics = [comic, ...this.comics.filter((c) => c.id !== comic.id)];
    this.storage.saveLibrary(this.comics);
    this.openComic(comic);
    this.newComicId = '';
    this.newComicTitle = '';
    this.newChapter = '1';
    this.draftChapters = [];
  }

  fetchDraftChapters(): void {
    const comicId = this.newComicId.trim();
    if (!comicId) {
      return;
    }
    this.chapterError = '';
    this.providerService
      .getChapters(comicId, this.provider, this.sourceUrl.trim(), this.sourceReferer.trim())
      .subscribe({
        next: (res) => {
          this.draftChapters = res.chapters;
          if (this.draftChapters.length > 0) {
            this.newChapter = this.draftChapters[0].id;
          }
        },
        error: (err) => {
          this.draftChapters = [];
          this.chapterError = err?.error ?? '章節載入失敗';
        },
      });
  }

  removeComic(comicId: string): void {
    this.comics = this.comics.filter((c) => c.id !== comicId);
    this.storage.saveLibrary(this.comics);
    if (this.currentComic?.id === comicId) {
      this.currentComic = undefined;
      this.pages = [];
    }
  }

  openComic(comic: Comic): void {
    const saved = this.progressMap[comic.id];
    this.currentComic = comic;
    this.currentChapter = saved?.chapter ?? comic.chapter;
    this.currentPageIndex = saved?.pageIndex ?? 0;
    this.loadPages();
  }

  prevPage(): void {
    if (this.currentPageIndex <= 0 || !this.currentComic) {
      return;
    }
    this.currentPageIndex -= 1;
    this.saveProgress();
  }

  nextPage(): void {
    if (this.currentPageIndex >= this.pages.length - 1 || !this.currentComic) {
      return;
    }
    this.currentPageIndex += 1;
    this.saveProgress();
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.prevPage();
    } else if (event.key === 'ArrowRight') {
      this.nextPage();
    }
  }

  private loadPages(): void {
    if (!this.currentComic) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.providerService
      .getPages(this.currentComic.id, this.currentChapter, this.provider, this.sourceUrl.trim(), this.sourceReferer.trim())
      .subscribe({
        next: (res) => {
          this.pages = res.pages;
          if (this.currentPageIndex >= this.pages.length) {
            this.currentPageIndex = 0;
          }
          this.saveProgress();
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error ?? '載入失敗';
          this.loading = false;
        },
      });
  }

  private saveProgress(): void {
    if (!this.currentComic) {
      return;
    }
    const progress: ReadingProgress = {
      comicId: this.currentComic.id,
      chapter: this.currentChapter,
      pageIndex: this.currentPageIndex,
      updatedAt: new Date().toISOString(),
    };
    this.progressMap[progress.comicId] = progress;
    this.storage.saveProgress(progress);
  }
}

