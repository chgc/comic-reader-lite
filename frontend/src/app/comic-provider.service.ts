import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChaptersResponse, PagesResponse } from './models';

export type ProviderMode = '8comic';

@Injectable({ providedIn: 'root' })
export class ComicProviderService {
  private readonly apiBase = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  getChapters(comicId: string, provider: ProviderMode, sourceUrl?: string, referer?: string): Observable<ChaptersResponse> {
    let params = new HttpParams().set('provider', provider);
    if (sourceUrl) {
      params = params.set('sourceUrl', sourceUrl);
    }
    if (referer) {
      params = params.set('referer', referer);
    }
    return this.http.get<ChaptersResponse>(`${this.apiBase}/comics/${comicId}/chapters`, { params });
  }

  getPages(comicId: string, chapter: string, provider: ProviderMode, sourceUrl?: string, referer?: string): Observable<PagesResponse> {
    let params = new HttpParams().set('provider', provider);
    if (sourceUrl) {
      params = params.set('sourceUrl', sourceUrl);
    }
    if (referer) {
      params = params.set('referer', referer);
    }
    return this.http.get<PagesResponse>(`${this.apiBase}/comics/${comicId}/chapters/${chapter}/pages`, { params });
  }
}

