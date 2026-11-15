import { Component, computed, effect, input, signal } from '@angular/core';
import { Farm } from '../core/models';

@Component({
  selector: 'app-farm-avatar',
  template: `
    <span class="farm-avatar" [class.xl]="large()" role="img" [attr.aria-label]="'Ảnh đại diện ' + farm().name" [style.background]="background()">
      @if (src() && !failed()) { <img [src]="src()" alt="" width="200" height="200" loading="lazy" decoding="async" (error)="failed.set(true)" /> }
      @else { <svg class="avatar-leaf icon" aria-hidden="true"><use href="icons.svg#leaf" /></svg><span>{{ initials() }}</span> }
    </span>
  `,
})
export class FarmAvatarComponent {
  readonly farm = input.required<Farm>();
  readonly large = input(false);
  protected failed = signal(false);
  protected src = computed(() => this.farm().avatarUrl || this.farm().images?.[0] || this.farm().referencePhotos?.[0]?.thumbnail || '');
  protected initials = computed(() => this.farm().name.split(/\s+/).filter(s => !['nông','trại','trang','htx','vườn','farm','các'].includes(s.toLowerCase())).slice(0,2).map(s=>s.charAt(0)).join('').toLocaleUpperCase('vi') || 'FT');
  protected background = computed(() => {
    const colors=['#dceccf','#e7edcc','#d8ebe3','#e9e4d0','#dce8eb'];
    const hash=Array.from(this.farm().name).reduce((n,c)=>n+c.charCodeAt(0),0);
    return colors[hash%colors.length];
  });
  constructor() { effect(() => { this.src(); this.failed.set(false); }); }
}
