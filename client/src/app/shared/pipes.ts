import { Pipe, PipeTransform } from '@angular/core';
import { CATEGORY_LABELS, Category, STATUS_LABELS } from '../core/models';

const vnd = new Intl.NumberFormat('vi-VN');

/** 45000 -> "45.000đ" */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `${vnd.format(Math.round(value))}đ`;
  }
}

/** Mã trạng thái -> nhãn tiếng Việt. */
@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? STATUS_LABELS[value] || value : '';
  }
}

@Pipe({ name: 'categoryLabel' })
export class CategoryLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? CATEGORY_LABELS[value as Category] || value : '';
  }
}

/** Thời gian còn lại dạng "2 ngày 3 giờ" (tĩnh, dùng cho danh sách). */
@Pipe({ name: 'timeLeft' })
export class TimeLeftPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, now: number = Date.now()): string {
    if (!value) return '';
    const ms = new Date(value).getTime() - now;
    if (ms <= 0) return 'Đã hết hạn';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d > 0) return `Còn ${d} ngày ${h} giờ`;
    if (h > 0) return `Còn ${h} giờ ${m} phút`;
    return `Còn ${m} phút`;
  }
}
