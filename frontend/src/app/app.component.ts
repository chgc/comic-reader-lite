import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ComicProviderService } from './comic-provider.service';
import { ChapterItem, ChaptersResponse, Comic, ComicMetaResponse, PageFrame, PagesResponse, ReadingProgress } from './models';
import { StorageService } from './storage.service';
import { UpdateService } from './update.service';

interface DraftInfo {
  chapters: ChapterItem[];
  meta?: ComicMetaResponse;
}

interface DraftParams {
  id: string;
  tick: number;
}

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

  newComicId = '';
  newChapter = '1';

  // ── Reader state ──────────────────────────────────────────────
  currentComic = signal<Comic | undefined>(undefined);

  /** Chapter follows the comic: switching comic auto-settles to its entry chapter.
   *  Loaded-progress chapters are applied explicitly (openComic / restoreFromUrl).
   *  Manual sets (jumpToChapter, openComic, URL restore) keep the chosen value. */
  currentChapter = linkedSignal<Comic | undefined, string>({
    source: this.currentComic,
    computation: (comic) => comic?.chapter ?? '1',
  });

  // Chapter list for the picker — refetches automatically when the comic changes
  readonly comicChaptersResource = httpResource<ChaptersResponse>(() => {
    const comic = this.currentComic();
    return comic ? { url: `${this.apiBase}/comics/${comic.id}/chapters`, params: { provider: '8comic' } } : undefined;
  });
  // NOTE: resource.value() RE-THROWS the loader error when status is 'error' — always gate on status first
  readonly comicChapters = computed(() =>
    this.comicChaptersResource.status() === 'error' ? [] : (this.comicChaptersResource.value()?.chapters ?? []),
  );

  // Pages — reactive on comic + chapter: chapter switch refetches & cancels in-flight request
  readonly pagesResource = httpResource<PagesResponse>(() => {
    const comic = this.currentComic();
    if (!comic) return undefined;
    return {
      url: `${this.apiBase}/comics/${comic.id}/chapters/${this.currentChapter()}/pages`,
      params: { provider: '8comic' },
    };
  });
  readonly pages = computed(() => (this.pagesResource.status() === 'error' ? [] : (this.pagesResource.value()?.pages ?? [])));
  readonly loading = this.pagesResource.isLoading;
  readonly error = computed(() => {
    if (this.pagesResource.status() !== 'error') return '';
    const e = this.pagesResource.error();
    if (!e) return '載入失敗';
    if (e instanceof HttpErrorResponse) {
      return typeof e.error === 'string' && e.error ? e.error : `載入失敗 (${e.status})`;
    }
    return '載入失敗';
  });

  // ── Add-comic draft form ──────────────────────────────────────
  private readonly draftComicId = signal('');
  private readonly draftFetchTick = signal(0);
  readonly comicInfoResource = resource<DraftInfo, DraftParams | undefined>({
    defaultValue: { chapters: [] as ChapterItem[] },
    // Click-driven: fetchDraftChapters() sets the id (+tick) — typing alone doesn't fire requests
    params: () => {
      const id = this.draftComicId();
      return id ? { id, tick: this.draftFetchTick() } : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      const [chapters, meta] = await Promise.all([
        this.fetchJson<ChaptersResponse>(`${this.apiBase}/comics/${params.id}/chapters?provider=8comic`, abortSignal),
        this.fetchJson<ComicMetaResponse>(`${this.apiBase}/comics/${params.id}/meta?provider=8comic`, abortSignal).catch(
          () => undefined,
        ),
      ]);
      return { chapters: chapters.chapters, meta };
    },
  });
  readonly draftChapters = computed(() =>
    this.comicInfoResource.status() === 'error' ? [] : (this.comicInfoResource.value()?.chapters ?? []),
  );
  readonly draftComicTitle = computed(() =>
    this.comicInfoResource.status() === 'error' ? '' : (this.comicInfoResource.value()?.meta?.title?.trim() ?? ''),
  );
  readonly chapterError = computed(() => {
    if (this.comicInfoResource.status() !== 'error') return '';
    const e = this.comicInfoResource.error();
    return e instanceof Error ? e.message : '章節載入失敗';
  });

  currentPageIndex = signal(0);
  activeTab = signal<'add' | 'history'>('history');
  showPanel = signal(false);
  showChapterPicker = signal(false);

  zoomLevel = signal(1.0);
  zoomLabel = computed(() => `${Math.round(this.zoomLevel() * 100)}%`);
  currentChapterIndex = computed(() => this.comicChapters().findIndex((c) => c.id === this.currentChapter()));
  hasPrevChapter = computed(() => this.currentChapterIndex() > 0);
  hasNextChapter = computed(() => {
    const idx = this.currentChapterIndex();
    return idx >= 0 && idx < this.comicChapters().length - 1;
  });

  private static readonly VIEWPORT_BUFFER = 2; // pages rendered on each side of the current one

  private readonly apiBase = '/api';

  private isScrolling = false;
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

    // When a chapter's pages resolve: clamp index, restore scroll, persist progress
    effect(() => {
      if (this.pagesResource.status() !== 'resolved') return;
      const res = this.pagesResource.value();
      if (!res) return;
      this.currentPageIndex.update((pi) => Math.min(pi, res.pages.length - 1));
      this.pendingScrollRestore = this.currentPageIndex() > 0;
      this.saveProgress();
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
    const draft = this.draftChapters();
    const chapterInput = this.newChapter.trim();
    const chapter = (draft.some((c) => c.id === chapterInput) ? chapterInput : draft[0]?.id) || '1';
    if (!comicId || !chapter) return;
    if (this.draftComicId() === comicId && this.draftComicTitle()) {
      this.persistComic(comicId, chapter, this.draftComicTitle().trim());
      return;
    }
    const fallbackTitle = comicId;
    this.providerService.getMeta(comicId).subscribe({
      next: (meta) => this.persistComic(comicId, chapter, meta.title?.trim() || fallbackTitle),
      error: () => this.persistComic(comicId, chapter, fallbackTitle),
    });
  }

  fetchDraftChapters(): void {
    const comicId = this.newComicId.trim();
    if (!comicId) return;
    this.draftComicId.set(comicId);
    // bump so repeated clicks on the same id re-fetch (resource params are memoized)
    this.draftFetchTick.update((t) => t + 1);
  }

  removeComic(comicId: string): void {
    this.comics.update((current) => current.filter((c) => c.id !== comicId));
    this.storage.saveLibrary(this.comics());
    if (this.currentComic()?.id === comicId) {
      this.currentComic.set(undefined);
      this.updateUrl();
    }
  }

  openComic(comic: Comic): void {
    const saved = this.progressMap()[comic.id];
    this.currentComic.set(comic);
    // Explicit override — linkedSignal gives the auto-reset default, this preserves the
    // original "re-open at saved position" semantics (incl. clicking the same comic).
    this.currentChapter.set(saved?.chapter ?? comic.chapter);
    this.currentPageIndex.set(saved?.pageIndex ?? 0);
    this.zoomLevel.set(saved?.zoom ?? 1.0);
    this.showChapterPicker.set(false);
    this.showPanel.set(false);
  }

  toggleChapterPicker(): void {
    this.showChapterPicker.update((v) => !v);
  }

  jumpToChapter(chapterId: string): void {
    this.showChapterPicker.set(false);
    this.currentChapter.set(chapterId);
    this.currentPageIndex.set(0);
    // pagesResource refetches automatically (param: currentChapter)
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
    if (!id) return;
    const comic = this.comics().find((c) => c.id === id);
    if (!comic) return;
    const saved = this.progressMap()[id];
    this.currentComic.set(comic);
    this.currentChapter.set(params.get('ch') ?? saved?.chapter ?? comic.chapter);
    this.currentPageIndex.set(saved?.pageIndex ?? 0);
    this.zoomLevel.set(saved?.zoom ?? 1.0);
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
    this.activeTab.set('history');
    this.newComicId = '';
    this.newChapter = '1';
    this.draftComicId.set(''); // clears the draft form (comicInfoResource goes idle)
  }

  private restoreScrollPosition(): void {
    const el = this.scrollReaderEl()?.nativeElement;
    if (!el) return;
    el.scrollTop = this.currentPageIndex() * el.clientHeight;
  }

  private async fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      let msg: string;
      try {
        msg = (await res.text()).trim() || `HTTP ${res.status}`;
      } catch {
        msg = `HTTP ${res.status}`;
      }
      throw new Error(msg);
    }
    return res.json() as Promise<T>;
  }
}