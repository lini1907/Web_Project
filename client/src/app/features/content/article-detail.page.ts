import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { ArticleDetail } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { ShopActions } from '../../core/services/shop-actions.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';
import { DIFFICULTY_LABELS } from './articles.page';

/** Chi tiết công thức / bài blog. Công thức: nguyên liệu gắn sản phẩm đang bán => thêm vào giỏ. */
@Component({
  selector: 'app-article-detail',
  imports: [RouterLink, DatePipe, MoneyPipe, StateComponent],
  template: `
    <div class="container page narrow">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(slug())" />
      } @else {
        @let a = article()!;
        <nav class="breadcrumb"><a [routerLink]="a.kind === 'recipe' ? '/recipes' : '/blog'">{{ a.kind === 'recipe' ? 'Công thức' : 'Blog' }}</a> › <span>{{ a.title }}</span></nav>
        <h1>{{ a.title }}</h1>
        <p class="muted small">{{ a.authorName }} · {{ a.publishedAt | date: 'dd/MM/yyyy' }} · {{ a.views }} lượt xem @for (t of a.tags; track t) { <span class="tag">{{ t }}</span> }</p>
        @if (a.coverImage) { <img class="cover" [src]="a.coverImage" [alt]="a.title" /> }
        @if (a.summary) { <p class="lead">{{ a.summary }}</p> }

        @if (a.recipe; as r) {
          <div class="recipe-facts">
            <div><b>{{ r.cookMinutes }} phút</b><small>Thời gian</small></div>
            <div><b>{{ r.servings }} người</b><small>Khẩu phần</small></div>
            <div><b>{{ difficulty[r.difficulty] }}</b><small>Độ khó</small></div>
          </div>
          <section class="card">
            <div class="row-between"><h2>Nguyên liệu</h2>
              @if (buyable().length) {
                <button type="button" class="btn btn-primary btn-sm" [disabled]="adding()" (click)="addAll()">🛒 Thêm {{ buyable().length }} nguyên liệu vào giỏ</button>
              }
            </div>
            <ul class="ingredients">
              @for (i of r.ingredients; track $index) {
                <li>
                  <span><b>{{ i.amount }}</b> {{ i.name }}</span>
                  @if (i.product; as p) {
                    <span class="small"><a [routerLink]="['/products', p.slug]">{{ p.name }}</a> · {{ p.price | money }}/{{ p.unit }}
                      @if (!p.inStock) { <span class="text-danger">· hết hàng</span> }</span>
                  }
                </li>
              }
            </ul>
          </section>
          <section class="card">
            <h2>Cách làm</h2>
            <ol class="steps-list">@for (s of r.steps; track $index) { <li>{{ s }}</li> }</ol>
          </section>
        }
        @if (paragraphs().length) {
          <section class="prose">@for (p of paragraphs(); track $index) { <p>{{ p }}</p> }</section>
        }
      }
    </div>
  `,
  styles: [
    `
      .cover { width: 100%; border-radius: 12px; margin: 8px 0 12px; aspect-ratio: 16/9; object-fit: cover; }
      .lead { font-size: 1.05rem; }
      .recipe-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
      .recipe-facts div { background: #f0fdf4; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; align-items: center; }
      .ingredients { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 8px; }
      .ingredients li { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-bottom: 1px dashed var(--border); padding-bottom: 6px; }
      .steps-list { display: grid; gap: 10px; padding-left: 20px; }
      section.card { margin-bottom: 14px; }
    `,
  ],
})
export class ArticleDetailPage {
  readonly slug = input.required<string>();
  private content = inject(ContentService);
  private actions = inject(ShopActions);
  private title = inject(Title);
  protected difficulty = DIFFICULTY_LABELS;
  protected article = signal<ArticleDetail | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected adding = signal(false);
  protected paragraphs = computed(() => (this.article()?.content || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean));
  protected buyable = computed(() => (this.article()?.recipe?.ingredients || []).filter((i) => i.product?.inStock).map((i) => i.product!));

  constructor() {
    effect(() => this.load(this.slug()));
  }

  load(slug: string): void {
    this.state.set('loading');
    this.content.get(slug).subscribe({
      next: (a) => {
        this.article.set(a);
        this.title.setTitle(`${a.title} · FarmTable`);
        this.state.set('ok');
      },
      error: (e) => {
        const err = ApiError.from(e);
        this.error.set(err.status === 404 ? 'Bài viết không tồn tại hoặc đã bị gỡ.' : err.message);
        this.state.set('error');
      },
    });
  }

  /** Thêm lần lượt từng nguyên liệu (mỗi thứ 1 đơn vị) vào giỏ. */
  async addAll(): Promise<void> {
    this.adding.set(true);
    try {
      for (const p of this.buyable()) {
        if (!(await this.actions.addProduct(p.id, p.name, 1))) break;
      }
    } finally {
      this.adding.set(false);
    }
  }
}
