import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F0FAF3"/><text x="60" y="70" font-size="40" text-anchor="middle">🥬</text></svg>',
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
