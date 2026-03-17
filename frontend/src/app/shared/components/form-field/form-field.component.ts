import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4">
      @if (label()) {
        <label class="label-field">
          {{ label() }}
          @if (required()) { <span class="text-red-500">*</span> }
        </label>
      }
      <ng-content />
      @if (error()) {
        <span class="error-text">{{ error() }}</span>
      }
      @if (hint()) {
        <span class="text-xs text-gray-400 mt-1 block">{{ hint() }}</span>
      }
    </div>
  `,
})
export class FormFieldComponent {
  label = input<string>();
  error = input<string>();
  hint = input<string>();
  required = input<boolean>(false);
}
