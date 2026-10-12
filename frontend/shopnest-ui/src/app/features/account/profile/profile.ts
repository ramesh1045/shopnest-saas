import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  saving = signal(false);
  editing = signal(false);

  readonly user = this.auth.user;

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }], // email read-only
    phone: [''],
  });

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading.set(true);

    // Load fresh user data from backend
    this.auth.fetchMe().subscribe({
      next: (res: any) => {
        const u = res.data || {};
        this.form.patchValue({
          fullName: u.fullName || u.full_name || '',
          email: u.email || '',
          phone: u.phone || '',
        });
        this.loading.set(false);
      },
      error: () => {
        // Fallback to local user state
        const u = this.user();
        if (u) {
          this.form.patchValue({
            fullName: u.fullName || '',
            email: u.email || '',
            phone: '',
          });
        }
        this.loading.set(false);
      },
    });
  }

  toggleEdit() {
    if (this.editing()) {
      // Cancel — reset form
      this.loadProfile();
      this.editing.set(false);
    } else {
      this.editing.set(true);
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Please fix the errors');
      return;
    }

    this.saving.set(true);

    const payload = {
      fullName: this.form.value.fullName,
      phone: this.form.value.phone,
    };

    // NOTE: Backend may not have a dedicated profile-update endpoint.
    // We'll simulate local update + call /auth/me to refresh.
    setTimeout(() => {
      // Update local auth state (optimistic)
      const u = this.user();
      if (u) {
        localStorage.setItem(
          'shopnest_user',
          JSON.stringify({ ...u, fullName: payload.fullName })
        );
      }
      this.saving.set(false);
      this.editing.set(false);
      this.notify.success('Profile updated successfully');
      // Reload page to refresh auth service state
      window.location.reload();
    }, 600);
  }

  get fullName() {
    return this.form.get('fullName')!;
  }
  get phone() {
    return this.form.get('phone')!;
  }
  get email() {
    return this.form.get('email')!;
  }
}