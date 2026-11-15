import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { ChatReply } from '../../core/models';
import { ContentService } from '../../core/services/content.service';
import { MoneyPipe } from '../../shared/pipes';

interface ChatLine {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatReply['products'];
  recipes?: ChatReply['recipes'];
  error?: boolean;
}

const STORAGE_KEY = 'ft-chat';

/**
 * Khung chat nổi "Bé Nông" (Gemini + function calling ở server).
 * Hội thoại chỉ lưu trong sessionStorage của tab; server không lưu nội dung chat.
 */
@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule, RouterLink, MoneyPipe],
  template: `
    @if (enabled()) {
      @if (!open()) {
        <button type="button" class="chat-fab" (click)="toggle()" aria-label="Mở trợ lý mua sắm">💬<span>Hỏi Bé Nông</span></button>
      } @else {
        <section class="chat-panel card" role="dialog" aria-label="Trợ lý mua sắm">
          <header class="chat-head">
            <div><b>🌱 Bé Nông</b><small>Trợ lý mua sắm FarmTable</small></div>
            <div class="row-gap">
              <button type="button" class="icon-btn" (click)="reset()" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới">↺</button>
              <button type="button" class="icon-btn" (click)="toggle()" aria-label="Đóng"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button>
            </div>
          </header>
          <div class="chat-body" #body aria-live="polite">
            @if (!lines().length) {
              <div class="bubble bot">Chào bạn! Mình có thể giúp tìm nông sản, gợi ý món ăn, giải thích phí ship hay tra đơn hàng. Bạn cần gì nè?</div>
              <div class="chips">
                @for (s of suggestions; track s) { <button type="button" class="chip" (click)="send(s)">{{ s }}</button> }
              </div>
            }
            @for (l of lines(); track $index) {
              <div class="bubble" [class.me]="l.role === 'user'" [class.bot]="l.role === 'assistant'" [class.err]="l.error">{{ l.content }}</div>
              @if (l.products?.length) {
                <div class="cards">
                  @for (p of l.products; track p.id) {
                    <a class="pcard" [routerLink]="['/products', p.slug]">
                      @if (p.image) { <img [src]="p.image" alt="" /> }
                      <span class="pname">{{ p.name }}</span>
                      <span class="pprice">{{ p.price | money }}/{{ p.unit }} @if (p.rescue) { <span class="tag tag-red">-{{ p.rescue.discountRate }}%</span> }</span>
                    </a>
                  }
                </div>
              }
              @for (r of l.recipes || []; track r.slug) {
                <a class="rcard" [routerLink]="['/recipes', r.slug]">🍲 <b>{{ r.title }}</b>@if (r.cookMinutes) { · {{ r.cookMinutes }} phút }</a>
              }
            }
            @if (busy()) { <div class="bubble bot typing"><span></span><span></span><span></span></div> }
          </div>
          <form class="chat-input" (ngSubmit)="send(draft)">
            <input class="input" name="msg" [(ngModel)]="draft" placeholder="Nhập câu hỏi..." maxlength="2000" autocomplete="off" [disabled]="busy()" aria-label="Tin nhắn" />
            <button type="submit" class="btn btn-primary btn-sm" [disabled]="busy() || !draft.trim()">Gửi</button>
          </form>
          <p class="chat-note">Trả lời do AI tạo, có thể chưa chính xác. Giá và tồn kho xem tại trang sản phẩm.</p>
        </section>
      }
    }
  `,
  styles: [
    `
      .chat-fab { position: fixed; right: 18px; bottom: 18px; z-index: 90; display: flex; align-items: center; gap: 8px; border: none; border-radius: 999px; padding: 12px 18px; background: var(--green, #16a34a); color: #fff; font: inherit; font-weight: 700; box-shadow: 0 6px 20px rgba(0,0,0,.18); cursor: pointer; }
      .chat-panel { position: fixed; right: 18px; bottom: 18px; z-index: 90; width: min(380px, calc(100vw - 32px)); height: min(600px, calc(100vh - 100px)); display: flex; flex-direction: column; padding: 0; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,.22); }
      .chat-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--green, #16a34a); color: #fff; }
      .chat-head small { display: block; opacity: .85; font-size: .75rem; }
      .chat-head .icon-btn { color: #fff; background: none; border: none; cursor: pointer; font-size: 1.1rem; }
      .chat-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f9fafb; }
      .bubble { max-width: 85%; padding: 8px 11px; border-radius: 14px; white-space: pre-wrap; line-height: 1.4; font-size: .92rem; }
      .bubble.bot { background: #fff; border: 1px solid var(--border); align-self: flex-start; border-bottom-left-radius: 4px; }
      .bubble.me { background: var(--green, #16a34a); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
      .bubble.err { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { border: 1px solid var(--green, #16a34a); color: var(--green-600, #15803d); background: #fff; border-radius: 999px; padding: 5px 10px; font: inherit; font-size: .82rem; cursor: pointer; }
      .cards { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
      .pcard { flex: 0 0 130px; background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 6px; display: flex; flex-direction: column; gap: 3px; color: inherit; text-decoration: none; font-size: .8rem; }
      .pcard img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; }
      .pname { font-weight: 600; line-height: 1.25; }
      .pprice { color: var(--green-600, #15803d); font-weight: 700; }
      .rcard { background: #fff; border: 1px dashed var(--green, #16a34a); border-radius: 10px; padding: 6px 10px; font-size: .85rem; color: inherit; text-decoration: none; align-self: flex-start; }
      .typing span { display: inline-block; width: 6px; height: 6px; margin: 0 2px; border-radius: 50%; background: #9ca3af; animation: blink 1.2s infinite; }
      .typing span:nth-child(2) { animation-delay: .2s; } .typing span:nth-child(3) { animation-delay: .4s; }
      @keyframes blink { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
      .chat-input { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--border); }
      .chat-input .input { flex: 1; }
      .chat-note { margin: 0; padding: 0 10px 8px; font-size: .7rem; color: var(--muted); }
    `,
  ],
})
export class ChatWidgetComponent {
  private content = inject(ContentService);
  private body = viewChild<ElementRef<HTMLElement>>('body');
  protected enabled = signal(false);
  protected open = signal(false);
  protected busy = signal(false);
  protected lines = signal<ChatLine[]>([]);
  protected draft = '';
  protected suggestions = ['Hôm nay có hàng giải cứu gì?', 'Gợi ý món ăn với trứng', 'Phí ship tính thế nào?', 'Đơn hàng của tôi đến đâu rồi?'];

  constructor() {
    this.content.chatStatus().subscribe({ next: (s) => this.enabled.set(s.enabled), error: () => undefined });
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) this.lines.set(JSON.parse(saved));
    } catch {
      /* trình duyệt chặn storage */
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    this.scroll();
  }

  reset(): void {
    this.lines.set([]);
    this.persist();
  }

  send(text: string): void {
    const content = text.trim();
    if (!content || this.busy()) return;
    this.draft = '';
    this.lines.update((l) => [...l, { role: 'user', content }]);
    this.busy.set(true);
    this.scroll();
    // Gửi tối đa 20 tin gần nhất (bỏ tin lỗi), bắt đầu bằng tin của người dùng.
    let history = this.lines()
      .filter((l) => !l.error)
      .map((l) => ({ role: l.role, content: l.content.slice(0, 2000) }))
      .slice(-20);
    while (history.length && history[0].role !== 'user') history = history.slice(1);
    this.content.chat(history).subscribe({
      next: (r) => {
        this.lines.update((l) => [...l, { role: 'assistant', content: r.reply, products: r.products, recipes: r.recipes }]);
        this.done();
      },
      error: (e) => {
        // Bỏ tin vừa gửi khỏi lịch sử để lần sau hội thoại vẫn xen kẽ đúng.
        this.lines.update((l) => [...l.slice(0, -1), { role: 'user', content, error: true }, { role: 'assistant', content: ApiError.from(e).message, error: true }]);
        this.done();
      },
    });
  }

  private done(): void {
    this.busy.set(false);
    this.persist();
    this.scroll();
  }

  private persist(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.lines().slice(-30)));
    } catch {
      /* bỏ qua */
    }
  }

  private scroll(): void {
    setTimeout(() => {
      const el = this.body()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
