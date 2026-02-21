import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComicProviderService } from './comic-provider.service';
import { ChapterItem, Comic, ReadingProgress } from './models';
import { StorageService } from './storage.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  host: {
    '(window:keydown)': 'onKey($event)',
  },
  template: `
    <main class="layout">
      <section class="panel">
        <h1>8comic 乾淨版瀏覽器</h1>
        <form class="add-form" (ngSubmit)="addComic()">
          <input [(ngModel)]="newComicId" name="comicId" placeholder="漫畫 ID" required />
          <button type="button" (click)="fetchDraftChapters()" [disabled]="!newComicId.trim()">取得章節</button>
          @if (draftComicTitle()) {
            <p>漫畫名稱：{{ draftComicTitle() }}</p>
          }
          <select [(ngModel)]="newChapter" name="chapter">
            @for (c of draftChapters(); track c.id) {
              <option [value]="c.id">{{ c.id }} - {{ c.title }}</option>
            }
          </select>
          @if (draftChapters().length === 0) {
            <input [(ngModel)]="newChapter" name="chapterInput" placeholder="章節" required />
          }
          <button type="submit">閱讀</button>
        </form>
        @if (chapterError()) {
          <p class="error">{{ chapterError() }}</p>
        }

        <ul class="comic-list">
          @for (comic of comics(); track comic.id) {
            <li>
              <button (click)="openComic(comic)">{{ comic.title }} ({{ comic.id }})</button>
              <span>ch{{ comic.chapter }}</span>
              <button class="danger" (click)="removeComic(comic.id)">移除</button>
            </li>
          }
        </ul>
      </section>

      @if (currentComic()) {
        <section class="reader">
          <h2>{{ currentComic()!.title }} - ch{{ currentChapter() }}</h2>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          @if (loading()) {
            <p>載入中...</p>
          }
          @if (!loading() && currentImage()) {
            <img [src]="currentImage()" alt="comic page" />
          }
          <div class="controls">
            <button (click)="prevPage()" [disabled]="currentPageIndex() <= 0">上一頁</button>
            <span>{{ currentPageIndex() + 1 }} / {{ pages().length || 0 }}</span>
            <button (click)="nextPage()" [disabled]="currentPageIndex() >= pages().length - 1">下一頁</button>
          </div>
        </section>
      }
    </main>
  `,
})
export class AppComponent {
  comics = signal<Comic[]>([]);
  progressMap = signal<Record<string, ReadingProgress>>({});

  draftChapters = signal<ChapterItem[]>([]);
  draftComicTitle = signal('');
  chapterError = signal('');

  newComicId = '';
  newChapter = '1';

  currentComic = signal<Comic | undefined>(undefined);
  currentChapter = signal('1');
  pages = signal<string[]>([]);
  currentPageIndex = signal(0);
  loading = signal(false);
  error = signal('');

  currentImage = computed(() => this.pages()[this.currentPageIndex()] ?? '');

  constructor(
    private readonly storage: StorageService,
    private readonly providerService: ComicProviderService,
  ) {
    this.comics.set(storage.loadLibrary());
    this.progressMap.set(storage.loadProgressMap());
  }

  addComic(): void {
    const comicId = this.newComicId.trim();
    const chapter = this.newChapter.trim() || this.draftChapters()[0]?.id || '1';
    if (!comicId || !chapter) {
      return;
    }
    const fallbackTitle = this.draftComicTitle().trim() || comicId;
    this.providerService
      .getMeta(comicId)
      .subscribe({
        next: (meta) => this.persistComic(comicId, chapter, meta.title?.trim() || fallbackTitle),
        error: () => this.persistComic(comicId, chapter, fallbackTitle),
      });
  }

  fetchDraftChapters(): void {
    const comicId = this.newComicId.trim();
    if (!comicId) {
      return;
    }
    this.chapterError.set('');
    this.providerService
      .getChapters(comicId)
      .subscribe({
        next: (res) => {
          this.draftChapters.set(res.chapters);
          if (this.draftChapters().length > 0) {
            this.newChapter = this.draftChapters()[0].id;
          }
        },
        error: (err) => {
          this.draftChapters.set([]);
          this.chapterError.set(err?.error ?? '章節載入失敗');
        },
      });
    this.providerService
      .getMeta(comicId)
      .subscribe({
        next: (meta) => this.draftComicTitle.set(meta.title?.trim() || ''),
        error: () => this.draftComicTitle.set(''),
      });
  }

  removeComic(comicId: string): void {
    this.comics.update(current => current.filter((c) => c.id !== comicId));
    this.storage.saveLibrary(this.comics());
    if (this.currentComic()?.id === comicId) {
      this.currentComic.set(undefined);
      this.pages.set([]);
    }
  }

  openComic(comic: Comic): void {
    const saved = this.progressMap()[comic.id];
    this.currentComic.set(comic);
    this.currentChapter.set(saved?.chapter ?? comic.chapter);
    this.currentPageIndex.set(saved?.pageIndex ?? 0);
    this.loadPages();
  }

  prevPage(): void {
    if (this.currentPageIndex() <= 0 || !this.currentComic()) {
      return;
    }
    this.currentPageIndex.update(i => i - 1);
    this.saveProgress();
  }

  nextPage(): void {
    if (this.currentPageIndex() >= this.pages().length - 1 || !this.currentComic()) {
      return;
    }
    this.currentPageIndex.update(i => i + 1);
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
    const comic = this.currentComic();
    if (!comic) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.providerService
      .getPages(comic.id, this.currentChapter())
      .subscribe({
        next: (res) => {
          this.pages.set(res.pages);
          if (this.currentPageIndex() >= this.pages().length) {
            this.currentPageIndex.set(0);
          }
          this.saveProgress();
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error ?? '載入失敗');
          this.loading.set(false);
        },
      });
  }

  private saveProgress(): void {
    const comic = this.currentComic();
    if (!comic) {
      return;
    }
    const progress: ReadingProgress = {
      comicId: comic.id,
      chapter: this.currentChapter(),
      pageIndex: this.currentPageIndex(),
      updatedAt: new Date().toISOString(),
    };
    this.progressMap.update(map => ({ ...map, [progress.comicId]: progress }));
    this.storage.saveProgress(progress);
  }

  private persistComic(comicId: string, chapter: string, title: string): void {
    const comic: Comic = {
      id: comicId,
      title: title || comicId,
      chapter,
      addedAt: new Date().toISOString(),
    };
    this.comics.update(current => [comic, ...current.filter((c) => c.id !== comic.id)]);
    this.storage.saveLibrary(this.comics());
    this.currentComic.set(comic);
    this.currentChapter.set(chapter);
    this.currentPageIndex.set(0);
    this.loadPages();
    this.newComicId = '';
    this.newChapter = '1';
    this.draftComicTitle.set('');
    this.draftChapters.set([]);
  }
}

