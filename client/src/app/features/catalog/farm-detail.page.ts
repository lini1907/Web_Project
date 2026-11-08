import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Farm } from '../../core/models';
import { ApiError } from '../../core/api';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StateComponent } from '../../shared/ui';

@Component({
  selector: 'app-farm-detail',
  imports: [RouterLink, DatePipe, ProductCardComponent, StateComponent],
  template: `
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(slug())" />
      } @else {
        @let f = farm()!;
        <nav class="breadcrumb"><a routerLink="/">Trang chủ</a> › <a routerLink="/farms">Nông trại</a> › <span>{{ f.name }}</span></nav>
        <section class="farm-hero">
          <div class="farm-avatar xl">{{ f.name.charAt(0) }}</div>
          <div>
            <h1>{{ f.name }}</h1>
            <div class="muted">📍 {{ f.address }}{{ f.address ? ', ' : '' }}{{ f.province }}</div>
            @if (f.vendor) { <div class="muted">Đồng hành cùng FarmTable từ {{ f.vendor.since | date: 'MM/yyyy' }}</div> }
            <div class="certs">@for (c of f.certifications; track c) { <span class="tag">✔ {{ c }}</span> }</div>
            <p class="prose">{{ f.story }}</p>
          </div>
        </section>
        <section class="section">
          <div class="section-head">
            <h2>Sản phẩm của nông trại</h2>
            <a [routerLink]="['/shop']" [queryParams]="{ farm: f.slug }" class="link">Lọc trong cửa hàng →</a>
          </div>
          <div class="product-grid cols-4">
            @for (p of f.products; track p.id) {
              <app-product-card [product]="p" />
            } @empty {
              <app-state state="empty" emptyText="Nông trại chưa có sản phẩm đang bán" />
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class FarmDetailPage {
  readonly slug = input.required<string>();
  private catalog = inject(CatalogService);
  private title = inject(Title);
  protected farm = signal<Farm | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);

  constructor() {
    effect(() => this.load(this.slug()));
  }

  load(slug: string): void {
    this.state.set('loading');
    this.catalog.farm(slug).subscribe({
      next: (f) => {
        this.farm.set(f);
        this.title.setTitle(`${f.name} · FarmTable`);
        this.state.set('ok');
      },
      error: (e) => {
        this.error.set(ApiError.from(e).message);
        this.state.set('error');
      },
    });
  }
}
