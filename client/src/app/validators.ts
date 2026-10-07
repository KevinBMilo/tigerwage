import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Checks that two password fields in a form group match
export function passwordsMatch(
  passwordKey = 'password',
  confirmKey = 'confirmPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    group.get(passwordKey)?.value === group.get(confirmKey)?.value
      ? null
      : { passwordsMismatch: true };
}