import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
    title: 'ShopNest - Multi-tenant E-commerce SaaS',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Sign In - ShopNest',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Create Account - ShopNest',
  },

  // STOREFRONT
  {
    path: 'store/:slug',
    loadComponent: () =>
      import('./features/storefront/store-home/store-home').then(
        (m) => m.StoreHomeComponent
      ),
  },
  {
    path: 'store/:slug/products',
    loadComponent: () =>
      import('./features/storefront/product-list/product-list').then(
        (m) => m.ProductListComponent
      ),
  },
  {
    path: 'store/:slug/product/:id',
    loadComponent: () =>
      import('./features/storefront/product-detail/product-detail').then(
        (m) => m.ProductDetailComponent
      ),
  },
  {
    path: 'store/:slug/cart',
    loadComponent: () =>
      import('./features/storefront/cart/cart').then((m) => m.CartComponent),
  },
  {
    path: 'store/:slug/checkout',
    loadComponent: () =>
      import('./features/storefront/checkout/checkout').then(
        (m) => m.CheckoutComponent
      ),
  },
  {
    path: 'store/:slug/order/:id/confirm',
    loadComponent: () =>
      import('./features/storefront/order-confirm/order-confirm').then(
        (m) => m.OrderConfirmComponent
      ),
  },

  // MERCHANT
  {
    path: 'merchant',
    loadComponent: () =>
      import('./features/merchant/merchant-layout/merchant-layout').then(
        (m) => m.MerchantLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/merchant/dashboard/dashboard').then(
            (m) => m.Dashboard
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/merchant/product-manage/product-manage').then(
            (m) => m.ProductManage
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/merchant/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/merchant/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/merchant/order-manage/order-manage').then(
            (m) => m.OrderManage
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/merchant/order-detail/order-detail').then(
            (m) => m.OrderDetail
          ),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/merchant/customer-manage/customer-manage').then(
            (m) => m.CustomerManage
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/merchant/settings/settings').then(
            (m) => m.Settings
          ),
      },
    ],
  },

  // CUSTOMER ACCOUNT
  {
    path: 'account',
    loadComponent: () =>
      import('./features/account/account-layout/account-layout').then(
        (m) => m.AccountLayoutComponent
      ),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/account/profile/profile').then(
            (m) => m.ProfileComponent
          ),
        title: 'Profile - ShopNest',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/account/my-orders/my-orders').then(
            (m) => m.MyOrdersComponent
          ),
        title: 'My Orders - ShopNest',
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/account/order-detail/order-detail').then(
            (m) => m.OrderDetailComponent
          ),
        title: 'Order Details - ShopNest',
      },
    ],
  },

  // MASTER ADMIN
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then(
        (m) => m.AdminLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/platform-overview/platform-overview').then(
            (m) => m.PlatformOverviewComponent
          ),
        title: 'Admin - ShopNest',
      },
      {
        path: 'stores',
        loadComponent: () =>
          import('./features/admin/stores-manage/stores-manage').then(
            (m) => m.StoresManage
          ),
        title: 'Stores - ShopNest',
      },
      {
        path: 'plans',
        loadComponent: () =>
          import('./features/admin/plans-manage/plans-manage').then(
            (m) => m.PlansManage
          ),
        title: 'Plans - ShopNest',
      },
    ],
  },

  { path: '**', redirectTo: '' },
];