import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorService } from '../../services/color.service';

@Component({
  selector: 'app-color-selector',
  imports: [FormsModule],
  template: `
    <select 
      class="colorSelector" 
      [(ngModel)]="selectedColor"
      (ngModelChange)="onColorChange($event)"
    >
      @for (color of colorService.colors; track color.name) {
        <option [value]="color.value">{{ color.name }}</option>
      }
    </select>
  `,
  styles: ``
})
export class ColorSelectorComponent {
  colorService = inject(ColorService);

  get selectedColor() {
    return this.colorService.currentColorValue().value;
  }
  set selectedColor(value: string) {
    this.colorService.setColor(value);
  }

  onColorChange(value: string): void {
    this.colorService.setColor(value);
  }
}