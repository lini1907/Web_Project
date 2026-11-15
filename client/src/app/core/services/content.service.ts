import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { ArticleDetail, ArticleInput, ArticleSummary, ChatReply, Paged } from '../models';

/** Công thức nấu ăn, blog (công khai + CRUD admin) và chatbot tư vấn. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);

  list(params: { kind?: string; q?: string; tag?: string; page?: number }): Observable<Paged<ArticleSummary>> {
    return this.http.get<Paged<ArticleSummary>>(`${API}/articles`, { params: toParams(params) });
  }
  get(slug: string): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${API}/articles/${encodeURIComponent(slug)}`);
  }

  // ----- Admin CRUD -----
  adminList(params: { kind?: string; status?: string; q?: string; page?: number }): Observable<Paged<ArticleSummary>> {
    return this.http.get<Paged<ArticleSummary>>(`${API}/admin/articles`, { params: toParams(params) });
  }
  adminGet(id: string): Observable<ArticleInput & { id: string; slug: string }> {
    return this.http.get<ArticleInput & { id: string; slug: string }>(`${API}/admin/articles/${id}`);
  }
  create(body: ArticleInput): Observable<ArticleDetail> {
    return this.http.post<ArticleDetail>(`${API}/admin/articles`, body);
  }
  update(id: string, body: Partial<ArticleInput>): Observable<ArticleDetail> {
    return this.http.patch<ArticleDetail>(`${API}/admin/articles/${id}`, body);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/articles/${id}`);
  }

  // ----- Chatbot -----
  chatStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${API}/chatbot/status`);
  }
  chat(messages: { role: 'user' | 'assistant'; content: string }[]): Observable<ChatReply> {
    return this.http.post<ChatReply>(`${API}/chatbot/messages`, { messages });
  }
}
