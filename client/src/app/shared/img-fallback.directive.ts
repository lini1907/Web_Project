import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F0FAF3"/><g fill="none" stroke="#31634b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="35" y="38" width="50" height="42" rx="4"/><path d="m35 68 15-15 12 12 8-8 15 15"/><circle cx="69" cy="50" r="4"/></g><text x="60" y="99" fill="#31634b" font-family="sans-serif" font-size="10" text-anchor="middle">Chưa có ảnh</text></svg>',
  );

/** Ảnh lỗi/thiếu => hiển thị ảnh thay thế (yêu cầu "ảnh thiếu có fallback"). Dùng: <img [src]="url" appImgFallback> */
@Directive({ selector: 'img[appImgFallback]' })
export class ImgFallbackDirective {
  private el = inject(ElementRef<HTMLImageElement>);
  readonly appImgFallback = input<string>('');

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement as HTMLImageElement;
    const fallback = this.appImgFallback() || PLACEHOLDER;
    if (img.src !== fallback) img.src = fallback;
  }
}
