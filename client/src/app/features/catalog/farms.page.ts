import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Farm } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { StateComponent } from '../../shared/ui';

@Component({
  selector: 'app-farms',
  imports: [RouterLink, FormsModule, StateComponent],
  template: `
    <div class="container page">
      <div class="page-head">
        <div>
          <h1><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> Nông trại đối tác</h1>
          <p class="muted">Mỗi sản phẩm trên FarmTable đều truy xuất được về một nông trại cụ thể.</p>
        </div>
        <div class="row-gap">
          <input class="input" type="search" placeholder="Tìm nông trại, tỉnh..." [(ngModel)]="q" aria-label="Tìm nông trại" />
          <select class="input" [(ngModel)]="province" aria-label="Lọc theo tỉnh">
            <option value="">Tất cả tỉnh</option>
            @for (p of provinces(); track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </div>
      </div>
      @if (state() !== 'ok') {
        <app-state [state]="state()" (retry)="load()" />
      } @else {
        <div class="farm-grid">
          @for (f of filtered(); track f.id) {
            <a class="farm-card" [routerLink]="['/farms', f.slug]">
              <div class="farm-avatar">{{ f.name.charAt(0) }}</div>
              <div>
                <h3>{{ f.name }}</h3>
                <div class="muted">📍 {{ f.province }} · {{ f.productCount }} sản phẩm</div>
                <p class="line-clamp-2">{{ f.story }}</p>
                <div class="certs">@for (c of f.certifications; track c) { <span class="tag">✔ {{ c }}</span> }</div>
              </div>
            </a>
          } @empty {
            <app-state state="empty" emptyText="Không tìm thấy nông trại phù hợp" />
          }
        </div>
      }
    </div>
  `,
})
export class FarmsPage {
  private catalog = inject(CatalogService);
  protected farms = signal<Farm[]>([]);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected qSig = signal('');
  protected provinceSig = signal('');
  get q() {
    return this.qSig();
  }
  set q(v: string) {
    this.qSig.set(v);
  }
  get province() {
    return this.provinceSig();
  }
  set province(v: string) {
    this.provinceSig.set(v);
  }
  protected provinces = computed(() => [...new Set(this.farms().map((f) => f.province).filter(Boolean))].sort());
  protected filtered = computed(() => {
    const q = this.qSig().trim().toLowerCase();
    return this.farms().filter(
      (f) => (!this.provinceSig() || f.province === this.provinceSig()) && (!q || `${f.name} ${f.province}`.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.catalog.farms().subscribe({
      next: (f) => {
        this.farms.set(f);
        this.state.set('ok');
      },
      error: () => this.state.set('error'),
    });
  }
}
