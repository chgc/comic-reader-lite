import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, signal, viewChild } from '@angular/core';
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
  currentChapterIndex = computed(() => this.comicChapters().findIndex((c) => c.id === this.currentChapter()));
  hasPrevChapter = computed(() => this.currentChapterIndex() > 0);
  hasNextChapter = computed(() => {
    const idx = this.currentChapterIndex();
    return idx >= 0 && idx < this.comicChapters().length - 1;
  });

  private isScrolling = false;

  readonly scrollReaderEl = viewChild<ElementRef<HTMLDivElement>>('scrollReader');

  constructor(
    private readonly storage: StorageService,
    private readonly providerService: ComicProviderService,
  ) {
    this.comics.set(storage.loadLibrary());
    this.progressMap.set(storage.loadProgressMap());
    this.restoreFromUrl();

    // Non-passive wheel listener: one page per scroll tick
    effect((onCleanup) => {
      const el = this.scrollReaderEl()?.nativeElement;
      if (!el) return;
      const handler = (e: WheelEvent) => {
        e.preventDefault();
        if (this.isScrolling) return;
        this.isScrolling = true;
        this.scrollToPageIndex(this.currentPageIndex() + (e.deltaY > 0 ? 1 : -1));
        setTimeout(() => { this.isScrolling = false; }, 400);
      };
      el.addEventListener('wheel', handler, { passive: false });
      onCleanup(() => el.removeEventListener('wheel', handler));
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
    this.chapterError.set('');
    this.providerService.getChapters(comicId).subscribe({
      next: (res) => {
        this.draftChapters.set(res.chapters);
        if (res.chapters.length > 0) this.newChapter = res.chapters[0].id;
      },
      error: (err) => {
        this.draftChapters.set([]);
        this.chapterError.set(err?.error ?? '章節載入失敗');
      },
    });
    this.providerService.getMeta(comicId).subscribe({
      next: (meta) => this.draftComicTitle.set(meta.title?.trim() || ''),
      error: () => this.draftComicTitle.set(''),
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
    } else if (event.key === '[') {
      event.preventDefault();
      this.prevChapter();
    } else if (event.key === ']') {
      event.preventDefault();
      this.nextChapter();
    }
  }

  onScrollReaderScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== this.currentPageIndex()) {
      this.currentPageIndex.set(idx);
      this.saveProgress();
    }
  }

  scrollToPageIndex(idx: number): void {
    const clamped = Math.max(0, Math.min(idx, this.pages().length - 1));
    this.currentPageIndex.set(clamped);
    this.scrollReaderEl()?.nativeElement.scrollTo({ top: clamped * this.scrollReaderEl()!.nativeElement.clientHeight, behavior: 'smooth' });
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
    this.loading.set(true);
    this.error.set('');
    this.providerService.getPages(comic.id, this.currentChapter()).subscribe({
      next: (res) => {
        this.pages.set(res.pages);
        if (this.currentPageIndex() >= this.pages().length) {
          this.currentPageIndex.set(0);
        }
        this.saveProgress();
        this.loading.set(false);
        // Restore scroll position after DOM renders the page placeholders
        if (this.currentPageIndex() > 0) {
          setTimeout(() => this.restoreScrollPosition());
        }
      },
      error: (err) => {
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
