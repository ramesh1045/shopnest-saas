import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../app/core/services/auth.service';
import { NotificationService } from '../../../../app/core/services//notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: ['STORE_OWNER' as 'STORE_OWNER' | 'CUSTOMER', [Validators.required]],
      agree: [false, [Validators.requiredTrue]],
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pwd = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (pwd && confirm && pwd !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  get fullName() { return this.form.get('fullName')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }
  get agree() { return this.form.get('agree')!; }

  submit() {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password, fullName, role } = this.form.value;

    this.auth
      .registerAndPersist({
        email: email!,
        password: password!,
        fullName: fullName!,
        role: role as any,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.notify.success('Account created! Welcome to ShopNest 🎉');
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.message || 'Registration failed');
        },
      });
  }
}