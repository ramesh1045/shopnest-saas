INSERT INTO plans (code, name, price_inr, max_products, max_staff, features) VALUES
('STARTER','Starter',499.00,50,0, JSON_OBJECT(
  'variants', false, 'coupons', false, 'analytics', 'basic',
  'csv_export', false, 'custom_domain', false, 'api_access', false
)),
('GROWTH','Growth',999.00,500,3, JSON_OBJECT(
  'variants', true, 'coupons', true, 'analytics', 'advanced',
  'csv_export', true, 'custom_domain', false, 'api_access', false
)),
('PRO','Pro',1999.00,2000,10, JSON_OBJECT(
  'variants', true, 'coupons', true, 'analytics', 'advanced',
  'csv_export', true, 'custom_domain', true, 'api_access', true
));