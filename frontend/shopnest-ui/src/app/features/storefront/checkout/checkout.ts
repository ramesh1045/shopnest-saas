import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store';
import { CartService } from '../../../core/services/cart.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreHeaderComponent } from '../../../shared/components/store-header/store-header';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Store as StoreModel } from '../../../core/models/store.model';
import { CheckoutRequest } from '../../../core/models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private cartService = inject(CartService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  loading = signal(true);
  placing = signal(false);
  errorMessage = signal<string | null>(null);

  readonly cart = this.cartService.cart;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly isLoggedIn = this.auth.isLoggedIn;

  paymentMethod = signal<'COD' | 'SIMULATED'>('COD');

  form = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^[0-9+\-\s]{6,20}$/)],
    ],
    line1: ['', [Validators.required, Validators.minLength(3)]],
    line2: [''],
    city: ['', [Validators.required, Validators.minLength(2)]],
    state: ['', [Validators.required, Validators.minLength(2)]],
    pincode: [
      '',
      [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)],
    ],
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

    // Must be logged in
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // Fetch store
    this.storeService.fetchStoreBySlug(slug).subscribe({
      next: () => this.store.set(this.storeService.currentStore()),
      error: () => {},
    });

    // Load cart
    this.cartService.loadCart(slug);

    // Prefill user data
    const user = this.auth.user();
    if (user) {
      this.form.patchValue({
        full_name: user.fullName,
      });
    }

    setTimeout(() => {
      this.loading.set(false);
      // If cart empty, go back
      if (this.itemCount() === 0) {
        this.router.navigate(['/store', slug, 'cart']);
      }
    }, 500);
  }

  get full_name() { return this.form.get('full_name')!; }
  get phone() { return this.form.get('phone')!; }
  get line1() { return this.form.get('line1')!; }
  get city() { return this.form.get('city')!; }
  get state() { return this.form.get('state')!; }
  get pincode() { return this.form.get('pincode')!; }

  selectPayment(method: 'COD' | 'SIMULATED') {
    this.paymentMethod.set(method);
  }

  placeOrder() {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Please fill all required fields correctly');
      return;
    }

    const slug = this.store()?.slug;
    if (!slug) return;

    if (this.itemCount() === 0) {
      this.notify.error('Your cart is empty');
      return;
    }

    this.placing.set(true);
    const v = this.form.value;

    const payload: CheckoutRequest = {
      store_slug: slug,
      customer_name: v.full_name!,
      customer_email: this.auth.user()?.email,
      customer_phone: v.phone!,
      shipping_address: {
        full_name: v.full_name!,
        phone: v.phone!,
        line1: v.line1!,
        line2: v.line2 || undefined,
        city: v.city!,
        state: v.state!,
        pincode: v.pincode!,
      },
      payment_method: this.paymentMethod(),
    };

    this.api.post<any>('/orders/checkout', payload).subscribe({
      next: (res) => {
        this.placing.set(false);

        // Clear local cart state
        this.cartService.clear();

        this.notify.success('Order placed successfully! 🎉');

        // Navigate to order confirmation
        this.router.navigate([
          '/store',
          slug,
          'order',
          res.data.order_id,
          'confirm',
        ]);
      },
      error: (err) => {
        this.placing.set(false);
        this.errorMessage.set(err.message || 'Failed to place order');
      },
    });
  }
}