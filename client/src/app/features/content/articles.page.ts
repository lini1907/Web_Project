import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArticleKind, ArticleSummary, Paged } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { PaginationComponent, StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';

export const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' } as const;

/** Danh sách công thức nấu ăn (/recipes) hoặc bài blog (/blog) — route truyền kind qua data. */
@Component({
  selector: 'app-articles',
  imports: [FormsModule, RouterLink, DatePipe, PaginationComponent, StateComponent, ImgFallbackDirective],
  template: `
    <div class="container page">
      <div class="page-head">
        <div>
          <h1>{{ kind() === 'recipe' ? 'Công thức nấu ăn' : 'Blog & mẹo bếp' }}</h1>
          <p class="muted">{{ kind() === 'recipe' ? 'Món ngon từ nông sản tươi — thêm cả nguyên liệu vào giỏ chỉ với một lần bấm.' : 'Kiến thức chọn, bảo quản nông sản và câu chuyện từ nhà vườn.' }}</p>
        </div>
        <form class="row-gap" (ngSubmit)="search()">
          <input class="input" name="q" type="search" [(ngModel)]="q" [placeholder]="kind() === 'recipe' ? 'Tên món, nguyên liệu...' : 'Tìm bài viết'" aria-label="Tìm" />
          <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
        </form>
      </div>
      @if (state() !== 'ok') {
        <app-state [state]="state()" emptyIcon="note" emptyText="Chưa có bài viết phù hợp" (retry)="load()" />
      } @else {
        <div class="article-grid">
          @for (a of result()!.data; track a.id) {
            <a class="card article-card" [routerLink]="[kind() === 'recipe' ? '/recipes' : '/blog', a.slug]">
              <div class="article-cover">@if (a.coverImage) { <img [src]="a.coverImage" alt="" loading="lazy" appImgFallback /> } @else { <span aria-hidden="true">{{ kind() === 'recipe' ? '🍲' : '📰' }}</span> }</div>
              <div class="article-body">
                <h2>{{ a.title }}</h2>
                <p class="muted small line-clamp-2">{{ a.summary }}</p>
                <div class="small muted">
                  @if (a.recipe) { ⏱ {{ a.recipe.cookMinutes }} phút · {{ a.recipe.servings }} người · {{ difficulty[a.recipe.difficulty] }} }
                  @else { {{ a.publishedAt | date: 'dd/MM/yyyy' }} · {{ a.authorName }} }
                </div>
                <div>@for (t of a.tags; track t) { <span class="tag">{{ t }}</span> }</div>
              </div>
            </a>
          }
        </div>
        <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
      }
    </div>
  `,
  styles: [
    `
      .article-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
      .article-card { display: flex; flex-direction: column; padding: 0; overflow: hidden; color: inherit; text-decoration: none; transition: transform 0.15s; }
      .article-card:hover { transform: translateY(-2px); }
      .article-cover { aspect-ratio: 16/9; background: #f0fdf4; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
      .article-cover img { width: 100%; height: 100%; object-fit: cover; }
      .article-body { padding: 12px 14px 14px; display: grid; gap: 6px; }
      .article-body h2 { font-size: 1.05rem; margin: 0; }
    `,
  ],
})
export class ArticlesPage {
  readonly kind = input<ArticleKind>('recipe');
  readonly qParam = input<string | undefined>(undefined, { alias: 'q' });
  private content = inject(ContentService);
  private router = inject(Router);
  protected difficulty = DIFFICULTY_LABELS;
  protected q = '';
  protected page = signal(1);
  protected result = signal<Paged<ArticleSummary> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    effect(() => {
      this.q = this.qParam() || '';
      this.kind();
      this.page.set(1);
      this.load();
    });
  }

  search(): void {
    this.router.navigate([], { queryParams: { q: this.q.trim() || null } });
  }

  load(): void {
    this.state.set('loading');
    this.content.list({ kind: this.kind(), q: this.q.trim() || undefined, page: this.page() }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
}
