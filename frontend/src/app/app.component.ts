import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComicProviderService } from './comic-provider.service';
import { ChapterItem, Comic, PageFrame, ReadingProgress } from './models';
import { StorageService } from './storage.service';
import { UpdateService } from './update.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  host: {
    '(window:keydown)': 'onKey($event)',
  },
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
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
  comicChapters = signal<ChapterItem[]>([]);
  pages = signal<string[]>([]);
  currentPageIndex = signal(0);
  activeTab = signal<'add' | 'history'>('history');
  showPanel = signal(false);
  showChapterPicker = signal(false);

  loading = signal(false);
  error = signal('');
  zoomLevel = signal(1.0);
  zoomLabel = computed(() => `${Math.round(this.zoomLevel() * 100)}%`);
  currentChapterIndex = computed(() => this.comicChapters().findIndex((c) => c.id === this.currentChapter()));
  hasPrevChapter = computed(() => this.currentChapterIndex() > 0);
  hasNextChapter = computed(() => {
    const idx = this.currentChapterIndex();
    return idx >= 0 && idx < this.comicChapters().length - 1;
  });

  private static readonly VIEWPORT_BUFFER = 2; // pages rendered on each side of the current one

  private isScrolling = false;
  private pagesRequestSeq = 0;
  private draftRequestSeq = 0;
  private progressSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingScrollRestore = false;

  readonly scrollReaderEl = viewChild<ElementRef<HTMLDivElement>>('scrollReader');

  /** Desktop layout renders one fixed-height page per viewport → safe to virtualize the DOM */
  readonly isDesktop = signal(false);
  /** Height of one page slot in the desktop reader (px), kept in sync via ResizeObserver */
  readonly viewportHeight = signal(0);
  readonly pageFrames = computed<PageFrame[]>(() => {
    const total = this.pages().length;
    const vh = this.viewportHeight();
    if (total === 0 || vh <= 0) return [];
    const idx = Math.max(0, Math.min(this.currentPageIndex(), total - 1));
    const start = Math.max(0, idx - AppComponent.VIEWPORT_BUFFER);
    const end = Math.min(total, idx + AppComponent.VIEWPORT_BUFFER + 1);
    const all = this.pages();
    const frames: PageFrame[] = new Array(end - start);
    for (let i = start; i < end; i++) {
      frames[i - start] = { index: i, url: all[i], offset: i * vh };
    }
    return frames;
  });

  readonly updateService = inject(UpdateService);

  constructor(
    private readonly storage: StorageService,
    private readonly providerService: ComicProviderService,
  ) {
    this.comics.set(storage.loadLibrary());
    this.progressMap.set(storage.loadProgressMap());
    this.restoreFromUrl();

    // Keep the desktop/mobile split in sync with the CSS breakpoint
    const mq = window.matchMedia('(min-width: 641px)');
    this.isDesktop.set(mq.matches);
    mq.addEventListener('change', (e) => this.isDesktop.set(e.matches));

    // Restore scroll position after the browser has rendered the loaded pages
    afterNextRender(() => {
      if (this.pendingScrollRestore) {
        this.pendingScrollRestore = false;
        this.restoreScrollPosition();
      }
    });

    // Non-passive wheel listener: one page per scroll tick, Ctrl+scroll to zoom
    effect((onCleanup) => {
      const el = this.scrollReaderEl()?.nativeElement;
      if (!el) return;

      // Track the one-viewport page slot height (only meaningful on the desktop reader).
      // Read synchronously so the virtualized spacer has a height before the first paint.
      const syncVh = el.clientHeight;
      if (syncVh > 0 && syncVh !== this.viewportHeight()) this.viewportHeight.set(syncVh);
      const ro = new ResizeObserver(() => {
        const vh = el.clientHeight;
        if (vh > 0 && vh !== this.viewportHeight()) this.viewportHeight.set(vh);
      });
      ro.observe(el);

      const handler = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey) {
          e.deltaY > 0 ? this.zoomOut() : this.zoomIn();
          return;
        }
        if (this.isScrolling) return;
        this.isScrolling = true;
        this.scrollToPageIndex(this.currentPageIndex() + (e.deltaY > 0 ? 1 : -1));
        setTimeout(() => { this.isScrolling = false; }, 400);
      };
      el.addEventListener('wheel', handler, { passive: false });
      onCleanup(() => {
        ro.disconnect();
        el.removeEventListener('wheel', handler);
      });
    });
  }

  addComic(): void {
    const comicId = this.newComicId.trim();
    const chapter = this.newChapter.trim() || this.draftChapters()[0]?.id || '1';
    if (!comicId || !chapter) return;
    const fallbackTitle = this.draftComicTitle().trim() || comicId;
    this.providerService.getMeta(comicId).subscribe({
      next: (meta) => this.persistComic(comicId, chapter, meta.title?.trim() || fallbackTitle),
      error: () => this.persistComic(comicId, chapter, fallbackTitle),
    });
  }

  fetchDraftChapters(): void {
    const comicId = this.newComicId.trim();
    if (!comicId) return;
    const seq = ++this.draftRequestSeq;
    this.chapterError.set('');
    this.providerService.getChapters(comicId).subscribe({
      next: (res) => {
        if (seq !== this.draftRequestSeq) return; // stale response
        this.draftChapters.set(res.chapters);
        if (res.chapters.length > 0) this.newChapter = res.chapters[0].id;
      },
      error: (err) => {
        if (seq !== this.draftRequestSeq) return;
        this.draftChapters.set([]);
        this.chapterError.set(err?.error ?? '章節載入失敗');
      },
    });
    this.providerService.getMeta(comicId).subscribe({
      next: (meta) => {
        if (seq === this.draftRequestSeq) this.draftComicTitle.set(meta.title?.trim() || '');
      },
      error: () => {
        if (seq === this.draftRequestSeq) this.draftComicTitle.set('');
      },
    });
  }

  removeComic(comicId: string): void {
    this.comics.update((current) => current.filter((c) => c.id !== comicId));
    this.storage.saveLibrary(this.comics());
    if (this.currentComic()?.id === comicId) {
      this.currentComic.set(undefined);
      this.pages.set([]);
      this.updateUrl();
    }
  }

  openComic(comic: Comic): void {
    const saved = this.progressMap()[comic.id];
    const switchingComic = this.currentComic()?.id !== comic.id;
    this.currentComic.set(comic);
    this.currentChapter.set(saved?.chapter ?? comic.chapter);
    this.currentPageIndex.set(saved?.pageIndex ?? 0);
    this.zoomLevel.set(saved?.zoom ?? 1.0);
    this.showChapterPicker.set(false);
    this.showPanel.set(false);
    if (switchingComic) this.comicChapters.set([]);
    this.loadChaptersForComic(comic.id);
    this.loadPages();
  }

  toggleChapterPicker(): void {
    this.showChapterPicker.update((v) => !v);
  }

  jumpToChapter(chapterId: string): void {
    this.showChapterPicker.set(false);
    this.currentChapter.set(chapterId);
    this.currentPageIndex.set(0);
    this.loadPages();
  }

  zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(3.0, Math.round((z + 0.1) * 10) / 10));
    this.saveProgress();
  }

  zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10));
    this.saveProgress();
  }

  resetZoom(): void {
    this.zoomLevel.set(1.0);
    this.saveProgress();
  }

  prevChapter(): void {
    const idx = this.currentChapterIndex();
    if (idx <= 0) return;
    this.jumpToChapter(this.comicChapters()[idx - 1].id);
  }

  nextChapter(): void {
    const idx = this.currentChapterIndex();
    if (idx < 0 || idx >= this.comicChapters().length - 1) return;
    this.jumpToChapter(this.comicChapters()[idx + 1].id);
  }

  onKey(event: KeyboardEvent): void {
    if (!this.currentComic()) return;
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.scrollToPageIndex(this.currentPageIndex() + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.scrollToPageIndex(this.currentPageIndex() - 1);
    } else if (event.key === '[' && this.hasPrevChapter()) {
      event.preventDefault();
      this.prevChapter();
    } else if (event.key === ']' && this.hasNextChapter()) {
      event.preventDefault();
      this.nextChapter();
    }
  }

  onScrollReaderScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.clientHeight <= 0) return;
    const total = this.pages().length;
    const idx = Math.max(0, Math.min(total - 1, Math.round(el.scrollTop / el.clientHeight)));
    if (idx !== this.currentPageIndex()) {
      this.currentPageIndex.set(idx);
      this.scheduleProgressSave();
    }
  }

  scrollToPageIndex(idx: number): void {
    const el = this.scrollReaderEl()?.nativeElement;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, this.pages().length - 1));
    if (clamped !== this.currentPageIndex()) {
      this.currentPageIndex.set(clamped);
      this.scheduleProgressSave();
    }
    // Instant jump: smooth scroll fights with CSS scroll-snap and spams scroll events
    el.scrollTo({ top: clamped * el.clientHeight, behavior: 'auto' });
  }

  private scheduleProgressSave(): void {
    if (this.progressSaveTimer !== null) return;
    this.progressSaveTimer = setTimeout(() => {
      this.progressSaveTimer = null;
      this.saveProgress();
    }, 400);
  }

  private restoreFromUrl(): void {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const ch = params.get('ch');
    if (!id) return;
    const comic = this.comics().find((c) => c.id === id);
    if (!comic) return;
    const saved = this.progressMap()[id];
    this.currentComic.set(comic);
    this.currentChapter.set(ch ?? comic.chapter);
    this.currentPageIndex.set(saved?.pageIndex ?? 0);
    this.loadChaptersForComic(comic.id);
    this.loadPages();
  }

  private updateUrl(): void {
    const comic = this.currentComic();
    if (!comic) {
      history.replaceState(null, '', location.pathname);
      return;
    }
    const params = new URLSearchParams({ id: comic.id, ch: this.currentChapter() });
    history.replaceState(null, '', `?${params}`);
  }

  private loadChaptersForComic(comicId: string): void {
    // Re-use draft chapters if we just added this comic
    if (this.draftChapters().length > 0 && this.comicChapters().length === 0) {
      this.comicChapters.set(this.draftChapters());
      return;
    }
    if (this.comicChapters().length > 0) return;
    this.providerService.getChapters(comicId).subscribe({
      next: (res) => this.comicChapters.set(res.chapters),
      error: () => this.comicChapters.set([]),
    });
  }

  private loadPages(): void {
    const comic = this.currentComic();
    if (!comic) return;
    const seq = ++this.pagesRequestSeq;
    this.loading.set(true);
    this.error.set('');
    this.providerService.getPages(comic.id, this.currentChapter()).subscribe({
      next: (res) => {
        if (seq !== this.pagesRequestSeq) return; // stale response (user already switched chapter)
        this.pages.set(res.pages);
        if (this.currentPageIndex() >= this.pages().length) {
          this.currentPageIndex.set(0);
          this.scrollReaderEl()?.nativeElement.scrollTo({ top: 0 });
        }
        this.saveProgress();
        this.loading.set(false);
        this.pendingScrollRestore = this.currentPageIndex() > 0;
      },
      error: (err) => {
        if (seq !== this.pagesRequestSeq) return;
        this.error.set(err?.error ?? '載入失敗');
        this.loading.set(false);
      },
    });
  }

  private restoreScrollPosition(): void {
    const el = this.scrollReaderEl()?.nativeElement;
    if (!el) return;
    el.scrollTop = this.currentPageIndex() * el.clientHeight;
  }

  private saveProgress(): void {
    const comic = this.currentComic();
    if (!comic) return;
    const progress: ReadingProgress = {
      comicId: comic.id,
      chapter: this.currentChapter(),
      pageIndex: this.currentPageIndex(),
      zoom: this.zoomLevel(),
      updatedAt: new Date().toISOString(),
    };
    this.progressMap.update((map) => ({ ...map, [progress.comicId]: progress }));
    this.storage.saveProgress(progress);
    // Bug 1: keep comics list chapter in sync
    this.comics.update((list) =>
      list.map((c) => (c.id === progress.comicId ? { ...c, chapter: progress.chapter } : c)),
    );
    this.storage.saveLibrary(this.comics());
    this.updateUrl();
  }

  private persistComic(comicId: string, chapter: string, title: string): void {
    const comic: Comic = {
      id: comicId,
      title: title || comicId,
      chapter,
      addedAt: new Date().toISOString(),
    };
    this.comics.update((c) => [comic, ...c.filter((x) => x.id !== comic.id)]);
    this.storage.saveLibrary(this.comics());
    this.currentComic.set(comic);
    this.currentChapter.set(chapter);
    this.currentPageIndex.set(0);
    // Carry over draft chapters so chapter nav works immediately
    this.comicChapters.set(this.draftChapters());
    this.loadPages();
    this.activeTab.set('history');
    this.newComicId = '';
    this.newChapter = '1';
    this.draftComicTitle.set('');
    this.draftChapters.set([]);
  }
}
