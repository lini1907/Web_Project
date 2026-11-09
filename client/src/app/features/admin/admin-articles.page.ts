import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API, ApiError } from '../../core/api';
import { ArticleInput, ArticleKind, ArticleSummary, Paged, Product } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent, StateComponent } from '../../shared/ui';

interface Draft {
  kind: ArticleKind;
  title: string;
  summary: string;
  coverImage: string;
  content: string;
  tags: string;
  status: 'draft' | 'published';
  servings: number;
  cookMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: { name: string; amount: string; productId: string }[];
  steps: string;
}

const emptyDraft = (kind: ArticleKind = 'recipe'): Draft => ({
  kind,
  title: '',
  summary: '',
  coverImage: '',
  content: '',
  tags: '',
  status: 'draft',
  servings: 2,
  cookMinutes: 30,
  difficulty: 'easy',
  ingredients: [{ name: '', amount: '', productId: '' }],
  steps: '',
});

/** Quản lý công thức nấu ăn & blog: thêm, xem, sửa, xóa, đăng/ẩn bài. */
@Component({
  selector: 'app-admin-articles',
  imports: [FormsModule, DatePipe, RouterLink, PaginationComponent, StateComponent],
  template: `
    <div class="page-head">
      <h1>Công thức & Blog</h1>
      <div class="row-gap">
        <button type="button" class="btn btn-outline btn-sm" (click)="openCreate('blog')">+ Bài blog</button>
        <button type="button" class="btn btn-primary btn-sm" (click)="openCreate('recipe')">+ Công thức</button>
      </div>
    </div>
    <form class="toolbar" (ngSubmit)="page.set(1); load()">
      <input class="input" name="q" type="search" placeholder="Tìm tiêu đề, nguyên liệu" [(ngModel)]="q" aria-label="Tìm bài viết" />
      <select class="input" name="kind" [(ngModel)]="kind" (ngModelChange)="page.set(1); load()" aria-label="Loại">
        <option value="">Tất cả loại</option><option value="recipe">Công thức</option><option value="blog">Blog</option>
      </select>
      <select class="input" name="status" [(ngModel)]="status" (ngModelChange)="page.set(1); load()" aria-label="Trạng thái">
        <option value="">Mọi trạng thái</option><option value="published">Đã đăng</option><option value="draft">Bản nháp</option>
      </select>
      <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
    </form>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyIcon="note" emptyText="Chưa có bài viết" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Tiêu đề</th><th>Loại</th><th>Trạng thái</th><th>Lượt xem</th><th>Cập nhật</th><th></th></tr></thead>
          <tbody>
            @for (a of result()!.data; track a.id) {
              <tr>
                <td>
                  @if (a.status === 'published') { <a [routerLink]="[a.kind === 'recipe' ? '/recipes' : '/blog', a.slug]" target="_blank"><b>{{ a.title }}</b></a> } @else { <b>{{ a.title }}</b> }
                  <br /><small class="muted">{{ a.summary }}</small>
                </td>
                <td>{{ a.kind === 'recipe' ? 'Công thức' : 'Blog' }}</td>
                <td>@if (a.status === 'published') { <span class="tag tag-green">Đã đăng</span> } @else { <span class="tag">Nháp</span> }</td>
                <td>{{ a.views }}</td>
                <td class="small">{{ a.updatedAt | date: 'dd/MM/yyyy' }}</td>
                <td class="row-gap">
                  <button type="button" class="btn btn-outline btn-xs" (click)="togglePublish(a)">{{ a.status === 'published' ? 'Ẩn' : 'Đăng' }}</button>
                  <button type="button" class="btn btn-outline btn-xs" (click)="openEdit(a)">Sửa</button>
                  <button type="button" class="btn btn-outline btn-xs text-danger" (click)="remove(a)">Xóa</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
    }

    @if (editingId() !== undefined) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal card form wide" (ngSubmit)="save()" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Sửa' : 'Thêm' }} {{ d.kind === 'recipe' ? 'công thức' : 'bài blog' }}</h2>
          <label>Tiêu đề * <input class="input" name="title" [(ngModel)]="d.title" maxlength="160" required /></label>
          @if (err('title')) { <span class="field-error">{{ err('title') }}</span> }
          <label>Tóm tắt <textarea class="input" name="summary" rows="2" [(ngModel)]="d.summary" maxlength="400"></textarea></label>
          <div class="form-row">
            <label>Ảnh bìa (URL) <input class="input" name="cover" [(ngModel)]="d.coverImage" placeholder="https://... hoặc /uploads/..." /></label>
            <label>Thẻ (cách nhau dấu phẩy) <input class="input" name="tags" [(ngModel)]="d.tags" placeholder="canh, cơm nhà" /></label>
          </div>
          @if (d.kind === 'recipe') {
            <div class="form-row">
              <label>Khẩu phần <input class="input" type="number" name="servings" [(ngModel)]="d.servings" min="1" /></label>
              <label>Thời gian (phút) <input class="input" type="number" name="cook" [(ngModel)]="d.cookMinutes" min="1" /></label>
              <label>Độ khó
                <select class="input" name="diff" [(ngModel)]="d.difficulty"><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select>
              </label>
            </div>
            <fieldset class="fieldset">
              <legend>Nguyên liệu *</legend>
              @for (i of d.ingredients; track $index; let idx = $index) {
                <div class="ing-row">
                  <input class="input" [name]="'ingName' + idx" [(ngModel)]="i.name" placeholder="Tên (vd Cà chua)" />
                  <input class="input" [name]="'ingAmt' + idx" [(ngModel)]="i.amount" placeholder="Lượng (vd 2 quả)" />
                  <select class="input" [name]="'ingProd' + idx" [(ngModel)]="i.productId" aria-label="Gắn sản phẩm">
                    <option value="">— Không gắn sản phẩm —</option>
                    @for (p of products(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                  </select>
                  <button type="button" class="btn btn-outline btn-xs" (click)="d.ingredients.splice(idx, 1)" [disabled]="d.ingredients.length === 1" aria-label="Xóa dòng">✕</button>
                </div>
              }
              <button type="button" class="btn btn-link btn-xs" (click)="d.ingredients.push({ name: '', amount: '', productId: '' })">+ Thêm nguyên liệu</button>
            </fieldset>
            <label>Các bước * (mỗi dòng một bước)
              <textarea class="input" name="steps" rows="5" [(ngModel)]="d.steps"></textarea>
            </label>
          }
          <label>{{ d.kind === 'recipe' ? 'Ghi chú thêm' : 'Nội dung *' }} (đoạn văn cách nhau bằng dòng trống)
            <textarea class="input" name="content" [rows]="d.kind === 'recipe' ? 3 : 10" [(ngModel)]="d.content" maxlength="20000"></textarea>
          </label>
          <label class="checkbox"><input type="checkbox" name="pub" [ngModel]="d.status === 'published'" (ngModelChange)="d.status = $event ? 'published' : 'draft'" /> Đăng ngay (bỏ chọn = lưu nháp)</label>
          @if (formError()) { <div class="note note-danger" role="alert">{{ formError() }}</div> }
          <div class="row-gap">
            <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Đang lưu...' : 'Lưu' }}</button>
            <button type="button" class="btn btn-outline" (click)="close()">Hủy</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [
    `
      .modal.wide { max-width: 760px; }
      .ing-row { display: grid; grid-template-columns: 1.2fr 0.8fr 1.4fr auto; gap: 6px; margin-bottom: 6px; }
      @media (max-width: 640px) { .ing-row { grid-template-columns: 1fr 1fr; } }
    `,
  ],
})
export class AdminArticlesPage {
  private api = inject(ContentService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  protected q = '';
  protected kind = '';
  protected status = '';
  protected page = signal(1);
  protected result = signal<Paged<ArticleSummary> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  /** undefined = đóng form, null = thêm mới, string = id đang sửa. */
  protected editingId = signal<string | null | undefined>(undefined);
  protected d: Draft = emptyDraft();
  protected saving = signal(false);
  protected formError = signal<string | null>(null);
  private fieldErrors = signal<Record<string, string>>({});
  protected products = signal<Product[]>([]);

  constructor() {
    this.load();
  }

  err(f: string): string | null {
    return this.fieldErrors()[f] || null;
  }

  load(): void {
    this.state.set('loading');
    this.api.adminList({ q: this.q || undefined, kind: this.kind || undefined, status: this.status || undefined, page: this.page() }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  /** Danh sách sản phẩm để gắn vào nguyên liệu (tải một lần). */
  private loadProducts(): void {
    if (this.products().length) return;
    this.http.get<Paged<Product>>(`${API}/products`, { params: { limit: 50, sort: 'popular' } }).subscribe({ next: (r) => this.products.set(r.data) });
  }

  openCreate(kind: ArticleKind): void {
    this.d = emptyDraft(kind);
    this.reset();
    if (kind === 'recipe') this.loadProducts();
    this.editingId.set(null);
  }

  openEdit(a: ArticleSummary): void {
    this.reset();
    this.api.adminGet(a.id).subscribe({
      next: (x) => {
        this.d = {
          kind: x.kind,
          title: x.title,
          summary: x.summary || '',
          coverImage: x.coverImage || '',
          content: x.content || '',
          tags: (x.tags || []).join(', '),
          status: x.status || 'draft',
          servings: x.recipe?.servings || 2,
          cookMinutes: x.recipe?.cookMinutes || 30,
          difficulty: x.recipe?.difficulty || 'easy',
          ingredients: x.recipe?.ingredients.map((i) => ({ name: i.name, amount: i.amount || '', productId: i.productId || '' })) || [{ name: '', amount: '', productId: '' }],
          steps: (x.recipe?.steps || []).join('\n'),
        };
        if (x.kind === 'recipe') this.loadProducts();
        this.editingId.set(a.id);
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  close(): void {
    this.editingId.set(undefined);
  }

  private reset(): void {
    this.formError.set(null);
    this.fieldErrors.set({});
  }

  private toInput(): ArticleInput {
    const d = this.d;
    return {
      kind: d.kind,
      title: d.title.trim(),
      summary: d.summary.trim(),
      coverImage: d.coverImage.trim(),
      content: d.content.trim(),
      tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10),
      status: d.status,
      recipe:
        d.kind === 'recipe'
          ? {
              servings: Number(d.servings) || 1,
              cookMinutes: Number(d.cookMinutes) || 1,
              difficulty: d.difficulty,
              ingredients: d.ingredients.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), productId: i.productId || null })),
              steps: d.steps.split('\n').map((s) => s.trim()).filter(Boolean),
            }
          : null,
    };
  }

  save(): void {
    const id = this.editingId();
    this.saving.set(true);
    this.reset();
    const body = this.toInput();
    (id ? this.api.update(id, body) : this.api.create(body)).subscribe({
      next: (a) => {
        this.saving.set(false);
        this.toast.success(id ? `Đã cập nhật "${a.title}"` : `Đã thêm "${a.title}"`);
        this.close();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        const err = ApiError.from(e);
        this.fieldErrors.set(err.fieldErrors());
        const detail = Object.entries(err.fieldErrors())
          .map(([f, m]) => `${f}: ${m}`)
          .join('; ');
        this.formError.set(detail ? `${err.message} (${detail})` : err.message);
      },
    });
  }

  togglePublish(a: ArticleSummary): void {
    this.api.update(a.id, { status: a.status === 'published' ? 'draft' : 'published' }).subscribe({
      next: () => {
        this.toast.success(a.status === 'published' ? 'Đã ẩn bài (chuyển về nháp)' : 'Đã đăng bài');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  remove(a: ArticleSummary): void {
    if (!confirm(`Xóa vĩnh viễn "${a.title}"?`)) return;
    this.api.remove(a.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa bài viết');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
