import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';

interface Plan {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  features: Record<string, any>;
  is_active: boolean | number;
}

interface EditForm {
  name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  is_active: boolean;
}

@Component({
  selector: 'app-plans-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyInrPipe],
  templateUrl: './plans-manage.html',
  styleUrl: './plans-manage.css',
})
export class PlansManage implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  saving = signal(false);
  plans = signal<Plan[]>([]);
  editingId = signal<number | null>(null);

  editForm: EditForm = {
    name: '',
    price_inr: 0,
    max_products: 0,
    max_staff: 0,
    is_active: true,
  };

  // Common features to toggle
  featureKeys = [
    { key: 'variants', label: 'Product Variants' },
    { key: 'coupons', label: 'Coupons & Discounts' },
    { key: 'csv_export', label: 'CSV Exports' },
    { key: 'custom_domain', label: 'Custom Domain' },
    { key: 'api_access', label: 'API & Webhooks' },
  ];

  featureToggles: Record<string, boolean> = {};

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.loading.set(true);
    this.api.get<Plan[]>('/admin/plans').subscribe({
      next: (res) => {
        this.plans.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load plans');
      },
    });
  }

  startEdit(plan: Plan) {
    this.editingId.set(plan.id);
    this.editForm = {
      name: plan.name,
      price_inr: Number(plan.price_inr),
      max_products: plan.max_products,
      max_staff: plan.max_staff,
      is_active: !!plan.is_active,
    };

    // Initialize feature toggles
    this.featureToggles = {};
    for (const f of this.featureKeys) {
      this.featureToggles[f.key] = !!plan.features?.[f.key];
    }
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  savePlan(plan: Plan) {
    if (!this.editForm.name || this.editForm.price_inr < 0) {
      this.notify.warning('Please enter valid values');
      return;
    }

    // Build features object from toggles
    const features: Record<string, any> = { ...plan.features };
    for (const f of this.featureKeys) {
      features[f.key] = this.featureToggles[f.key];
    }

    this.saving.set(true);

    this.api
      .patch(`/admin/plans/${plan.id}`, {
        name: this.editForm.name,
        price_inr: Number(this.editForm.price_inr),
        max_products: Number(this.editForm.max_products),
        max_staff: Number(this.editForm.max_staff),
        is_active: this.editForm.is_active,
        features,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editingId.set(null);
          this.notify.success('Plan updated successfully');
          this.loadPlans();
        },
        error: (err) => {
          this.saving.set(false);
          this.notify.error(err.message || 'Failed to update plan');
        },
      });
  }

  getPlanClass(code: string): string {
    switch (code) {
      case 'STARTER': return 'plan-starter';
      case 'GROWTH': return 'plan-growth';
      case 'PRO': return 'plan-pro';
      default: return 'plan-default';
    }
  }

  getPlanIcon(code: string): string {
    switch (code) {
      case 'STARTER': return 'bi-rocket';
      case 'GROWTH': return 'bi-graph-up-arrow';
      case 'PRO': return 'bi-stars';
      default: return 'bi-box';
    }
  }
}