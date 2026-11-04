import { Pipe, PipeTransform } from '@angular/core';

/**
 * Masks an API key prefix for secure display in tables and lists,
 * e.g. "kf_live_ab123456" -> "kf_live_ab123456••••••••••••••••".
 * Ensures raw keys are never displayed in plaintext.
 */
@Pipe({
  name: 'maskKey',
  standalone: true,
})
export class MaskKeyPipe implements PipeTransform {
  transform(keyPrefix: string | null | undefined): string {
    if (!keyPrefix) {
      return '••••••••••••••••••••••••';
    }
    return `${keyPrefix}••••••••••••••••`;
  }
}
