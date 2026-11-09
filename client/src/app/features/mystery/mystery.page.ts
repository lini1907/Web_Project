import { Component, inject, signal } from '@angular/core';
import { MysteryBox } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ShopActions } from '../../core/services/shop-actions.service';
import { CategoryLabelPipe, MoneyPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';

/**
 * Mystery Box: API công khai KHÔNG trả danh sách thành phần (chỉ nhóm hàng + giá trị ước tính dạng khoảng).
 * Số hộp còn lại do server suy ra từ tồn kho nguyên liệu.
 */
@Component({
  selector: 'app-mystery',
  imports: [MoneyPipe, CategoryLabelPipe, StateComponent, ImgFallbackDirective],
  template: `
    <section class="band band-purple">
      <div class="container band-inner">
        <div>
          <h1>Mở hộp mới biết — nông sản theo mùa</h1>
          <p>Mỗi hộp là một lựa chọn nông sản theo mùa từ nhà vườn. Nhóm hàng, số loại và khoảng giá trị ước tính được hiển thị trước khi bạn chọn hộp; thành phần cụ thể được giữ bí mật tới khi nhận hàng.</p>
        </div>
      </div>
    </section>
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" emptyText="Chưa có hộp bí ẩn nào đang bán" emptyIcon="box" (retry)="load()" />
      } @else {
        <div class="box-grid">
          @for (b of boxes(); track b.id) {
            <article class="box-card">
              <div class="box-img">
                <img [src]="b.image" [alt]="b.name" appImgFallback />
                <span class="box-q">Thành phần bất ngờ theo mùa</span>
              </div>
              <div class="box-body">
                <h2>{{ b.name }}</h2>
                <div class="muted">Nhà bán: {{ b.vendor.name }} · đã bán {{ b.soldCount }}</div>
                <div class="box-price">{{ b.price | money }}</div>
                @if (b.estimatedValue) {
                  <div class="note"><svg class="icon" aria-hidden="true"><use href="icons.svg#info" /></svg> Giá trị ước tính {{ b.estimatedValue.min | money }} – {{ b.estimatedValue.max | money }}</div>
                }
                <ul class="box-facts">
                  <li><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> {{ b.itemCount }} loại nông sản</li>
                  <li><svg class="icon" aria-hidden="true"><use href="icons.svg#tag" /></svg> Nhóm: @for (c of b.categories; track c) { <span class="tag">{{ c | categoryLabel }}</span> }</li>
                  <li><svg class="icon" aria-hidden="true"><use href="icons.svg#note" /></svg> {{ b.publicNote }}</li>
                  <li [class.text-danger]="b.available === 0"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> {{ b.available > 0 ? 'Còn ' + b.available + ' hộp' : 'Tạm hết — nguyên liệu không đủ' }}</li>
                </ul>
                <button type="button" class="btn btn-purple btn-block" [disabled]="b.available === 0 || actions.busyId() === b.id" (click)="actions.addBox(b.id, b.name)">
                  {{ b.available === 0 ? 'Tạm hết hộp' : actions.busyId() === b.id ? 'Đang thêm...' : 'Thêm hộp vào giỏ' }}
                </button>
              </div>
            </article>
          }
        </div>
        <section class="section card">
          <h2>Câu hỏi thường gặp</h2>
          <details><summary>Vì sao không xem trước được thành phần?</summary><p>Để giữ yếu tố bất ngờ và giúp nhà vườn tiêu thụ nông sản đang vào mùa. Hệ thống chỉ công khai nhóm hàng và khoảng giá trị.</p></details>
          <details><summary>Nếu một nguyên liệu hết hàng?</summary><p>Số hộp còn bán được tính theo nguyên liệu ít nhất. Thiếu một thành phần thì hộp tự chuyển sang "tạm hết", không bán thiếu.</p></details>
          <details><summary>Có được hủy không?</summary><p>Được, khi nhà bán chưa xác nhận đơn. Nguyên liệu sẽ được hoàn lại kho.</p></details>
        </section>
      }
    </div>
  `,
})
export class MysteryPage {
  private catalog = inject(CatalogService);
  protected actions = inject(ShopActions);
  protected boxes = signal<MysteryBox[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.catalog.mysteryBoxes().subscribe({
      next: (b) => {
        this.boxes.set(b);
        this.state.set(b.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
}
