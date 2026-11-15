import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Farm, FarmPhoto } from '../../core/models';
import { ApiError } from '../../core/api';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { FarmAvatarComponent } from '../../shared/farm-avatar.component';

@Component({
  selector: 'app-farm-detail',
  imports: [RouterLink, DatePipe, ProductCardComponent, StateComponent, ImgFallbackDirective, FarmAvatarComponent],
  template: `
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(slug())" />
      } @else {
        @let f = farm()!;
        <nav class="breadcrumb"><a routerLink="/">Trang chủ</a> › <a routerLink="/farms">Nông trại</a> › <span>{{ f.name }}</span></nav>
        <section class="farm-hero">
          <app-farm-avatar [farm]="f" [large]="true" />
          <div>
            <h1>{{ f.name }}</h1>
            <div class="muted"><svg class="icon" aria-hidden="true"><use href="icons.svg#pin" /></svg> {{ f.address }}{{ f.address ? ', ' : '' }}{{ f.province }}</div>
            @if (f.vendor) { <div class="muted">Tài khoản nhà bán tham gia từ {{ f.vendor.since | date: 'MM/yyyy' }}</div> }
            @if (f.isDemo) { <p class="demo-label">Hồ sơ mẫu cho đồ án. Câu chuyện và chứng nhận chưa được xác minh thực tế.</p> }
            <p class="prose">{{ f.story }}</p>
          </div>
        </section>
        @if (photos().length) {
          <section class="section farm-photo-section" aria-label="Album ảnh nông trại">
            <div class="section-head"><h2>{{ f.images.length ? 'Ảnh nông trại' : 'Không gian canh tác tham khảo' }}</h2><span class="muted small">{{ photos().length }} ảnh</span></div>
            @if (!f.images.length) { <p class="muted small farm-photo-note">Ảnh chụp thật được chọn theo khu vực hoặc mô hình canh tác. Đây là ảnh tham khảo, chưa xác nhận thuộc nhà bán trong hồ sơ mẫu này.</p> }
            @let photo = photos()[activePhoto()];
            <div class="farm-gallery">
              <figure><img [src]="photo.url" [alt]="photo.caption" width="1200" height="800" appImgFallback /><figcaption>{{ photo.caption }}@if (photo.artist) { · {{ photo.artist }} }@if (photo.source) { · <a [href]="photo.source" target="_blank" rel="noopener noreferrer">Nguồn ảnh</a> }@if (photo.license) { · <a [href]="photo.licenseUrl || photo.source" target="_blank" rel="noopener noreferrer">{{ photo.license }}</a> }@if (photo.kind === 'reference') { · Đã đổi kích thước và định dạng WebP. }</figcaption></figure>
              <div class="farm-photo-thumbs" role="group" aria-label="Chọn ảnh nông trại">
                @for (item of photos(); track item.url; let i = $index) { <button type="button" [class.active]="activePhoto() === i" [attr.aria-pressed]="activePhoto() === i" [attr.aria-label]="'Xem ảnh ' + (i + 1) + ': ' + item.caption" (click)="activePhoto.set(i)"><img [src]="item.thumbnail || item.url" alt="" width="200" height="140" loading="lazy" appImgFallback /></button> }
              </div>
            </div>
          </section>
        }
        <section class="section source-details" aria-label="Hồ sơ nguồn hàng">
          <div><h2>Thông tin nguồn hàng</h2><dl class="product-facts"><div><dt>Nhà bán</dt><dd>{{ f.vendor?.name || f.name }}</dd></div><div><dt>Địa phương</dt><dd>{{ f.province || 'Chưa cung cấp' }}</dd></div><div><dt>Địa chỉ khai báo</dt><dd>{{ f.address || 'Chưa cung cấp' }}</dd></div></dl></div>
          <div><h2>Chứng nhận nhà bán khai báo</h2><div class="certs">@for (c of f.certifications; track c) { <span class="tag">{{ c }}</span> } @empty { <p class="muted">Chưa cung cấp chứng nhận.</p> }</div><p class="small muted">Chưa có tài liệu chứng nhận được xác minh trên FarmTable. Việc tài khoản được duyệt đăng bán không thay thế xác minh tiêu chuẩn sản phẩm.</p></div>
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
  protected activePhoto = signal(0);
  protected photos = computed<FarmPhoto[]>(() => { const f=this.farm(); return f?.images.length ? f.images.map(url=>({url,caption:'Ảnh do nhà bán cung cấp',kind:'seller-provided' as const})) : f?.referencePhotos || []; });
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  private requestId = 0;

  constructor() {
    effect(() => this.load(this.slug()));
  }

  load(slug: string): void {
    const requestId = ++this.requestId;
    this.state.set('loading');
    this.catalog.farm(slug).subscribe({
      next: (f) => {
        if (requestId !== this.requestId) return;
        this.farm.set(f);
        this.activePhoto.set(0);
        this.title.setTitle(`${f.name} · FarmTable`);
        this.state.set('ok');
      },
      error: (e) => {
        if (requestId !== this.requestId) return;
        this.error.set(ApiError.from(e).message);
        this.state.set('error');
      },
    });
  }
}
