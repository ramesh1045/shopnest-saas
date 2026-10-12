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

  // ============ STOREFRONT ============
  {
    path: 'store/:slug',
    loadComponent: () =>
      import('./features/storefront/store-home/store-home').then(
        (m) => m.StoreHomeComponent
      ),
    title: 'Store - ShopNest',
  },
  {
    path: 'store/:slug/products',
    loadComponent: () =>
      import('./features/storefront/product-list/product-list').then(
        (m) => m.ProductListComponent
      ),
    title: 'Products - ShopNest',
  },
  {
    path: 'store/:slug/product/:id',
    loadComponent: () =>
      import('./features/storefront/product-detail/product-detail').then(
        (m) => m.ProductDetailComponent
      ),
    title: 'Product - ShopNest',
  },
  {
    path: 'store/:slug/cart',
    loadComponent: () =>
      import('./features/storefront/cart/cart').then(
        (m) => m.CartComponent
      ),
    title: 'Cart - ShopNest',
  },
  {
    path: 'store/:slug/checkout',
    loadComponent: () =>
      import('./features/storefront/checkout/checkout').then(
        (m) => m.CheckoutComponent
      ),
    title: 'Checkout - ShopNest',
  },
  {
    path: 'store/:slug/order/:id/confirm',
    loadComponent: () =>
      import('./features/storefront/order-confirm/order-confirm').then(
        (m) => m.OrderConfirmComponent
      ),
    title: 'Order Confirmed - ShopNest',
  },

  // ============ MERCHANT ============
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
        title: 'Dashboard - ShopNest',
      },      {
        path: 'products',
        loadComponent: () =>
          import('./features/merchant/product-manage/product-manage').then(
            (m) => m.ProductManage
          ),
        title: 'Products - ShopNest',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/merchant/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
        title: 'Add Product - ShopNest',
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/merchant/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
        title: 'Edit Product - ShopNest',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/merchant/product-manage/product-manage').then(
            (m) => m.ProductManage
          ),
        title: 'Products - ShopNest',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/merchant/order-manage/order-manage').then(
            (m) => m.OrderManage
          ),
        title: 'Orders - ShopNest',
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/merchant/order-detail/order-detail').then(
            (m) => m.OrderDetail
          ),
        title: 'Order Details - ShopNest',
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/merchant/customer-manage/customer-manage').then(
            (m) => m.CustomerManage
          ),
        title: 'Customers - ShopNest',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/merchant/settings/settings').then(
            (m) => m.Settings
          ),
        title: 'Settings - ShopNest',
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];