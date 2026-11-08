import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GroupBuy } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { CountdownComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';
import { MoneyPipe } from '../../shared/pipes';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';

@Component({
  selector: 'app-group-buy-list',
  imports: [RouterLink, CountdownComponent, StateComponent, StatusBadgeComponent, MoneyPipe, ImgFallbackDirective],
  template: `
    <section class="band band-orange">
      <div class="container band-inner">
        <div>
          <span class="tag tag-light">👥 MUA CHUNG</span>
          <h1>Rủ nhau mua — đủ người là chốt giá nhóm</h1>
          <p>Tham gia là <b>cam kết mua</b>, chưa phải trả tiền. Khi chiến dịch đạt ngưỡng, hệ thống tự tạo đơn COD giá nhóm cho từng thành viên. Không đạt ngưỡng thì cam kết được hủy, không mất phí.</p>
        </div>
      </div>
    </section>
    <div class="container page">
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button type="button" class="tab" [class.active]="tab() === t.key" (click)="switch(t.key)">{{ t.label }}</button>
        }
      </div>
      @if (state() !== 'ok') {
        <app-state [state]="state()" emptyText="Chưa có chiến dịch nào" emptyIcon="👥" (retry)="load()" />
      } @else {
        <div class="gb-grid">
          @for (g of items(); track g.id) {
            <a class="gb-card" [routerLink]="['/group-buy', g.id]">
              <img [src]="g.product.mainImage" alt="" appImgFallback />
              <div class="gb-body">
                <div class="row-between"><app-status [value]="g.status" /> <span class="muted small">{{ g.vendor.name }}</span></div>
                <div class="gb-title line-clamp-2">{{ g.title }}</div>
                <div class="gb-price">{{ g.groupPrice | money }} <s>{{ g.regularPrice | money }}</s> <span class="tag tag-orange">-{{ g.discountRate }}%</span></div>
                <div class="progress" [class.done]="g.reachedTarget"><div [style.width.%]="g.progress"></div></div>
                <div class="gb-meta">
                  <span>{{ g.joinedQty }}/{{ g.targetQty }} {{ g.product.unit }} · {{ g.memberCount }} người</span>
                  @if (g.status === 'open') { <app-countdown [deadline]="g.deadline" [serverTime]="g.serverTime" /> } @else { <span class="small muted">{{ g.closeReason }}</span> }
                </div>
                @if (g.myMembership) { <div class="tag tag-green">Bạn đã tham gia · {{ g.myMembership.qty }} {{ g.product.unit }}</div> }
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class GroupBuyListPage {
  private catalog = inject(CatalogService);
  protected tabs = [
    { key: 'open', label: 'Đang mở' },
    { key: 'closed', label: 'Đã chốt' },
    { key: 'all', label: 'Tất cả' },
  ];
  protected tab = signal('open');
  protected items = signal<GroupBuy[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    this.load();
  }
  switch(key: string): void {
    this.tab.set(key);
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.catalog.groupBuys(this.tab()).subscribe({
      next: (r) => {
        this.items.set(r);
        this.state.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
}
