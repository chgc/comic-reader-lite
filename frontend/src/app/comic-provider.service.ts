import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComicMetaResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ComicProviderService {
  private readonly apiBase = '/api';

  constructor(private readonly http: HttpClient) {}

  getMeta(comicId: string): Observable<ComicMetaResponse> {
    const params = new HttpParams().set('provider', '8comic');
    return this.http.get<ComicMetaResponse>(`${this.apiBase}/comics/${comicId}/meta`, { params });
  }
}