import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChaptersResponse, ComicMetaResponse, PagesResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ComicProviderService {
  private readonly apiBase = '/api';

  constructor(private readonly http: HttpClient) {}

  getChapters(comicId: string): Observable<ChaptersResponse> {
    const params = new HttpParams().set('provider', '8comic');
    return this.http.get<ChaptersResponse>(`${this.apiBase}/comics/${comicId}/chapters`, { params });
  }

  getMeta(comicId: string): Observable<ComicMetaResponse> {
    const params = new HttpParams().set('provider', '8comic');
    return this.http.get<ComicMetaResponse>(`${this.apiBase}/comics/${comicId}/meta`, { params });
  }

  getPages(comicId: string, chapter: string): Observable<PagesResponse> {
    const params = new HttpParams().set('provider', '8comic');
    return this.http.get<PagesResponse>(`${this.apiBase}/comics/${comicId}/chapters/${chapter}/pages`, { params });
  }
}

