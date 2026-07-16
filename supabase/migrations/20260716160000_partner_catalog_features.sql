-- Web application and mobile package comparison features

-- Web App: Accelerate
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('user_roles', 'User Roles', 'Up to 3', 1),
  ('authentication', 'Authentication', '✓', 2),
  ('dashboard', 'Dashboard', '✓', 3),
  ('admin_panel', 'Admin Panel', '✓', 4),
  ('api_integrations', 'API Integrations', 'Up to 3', 5),
  ('workflow', 'Workflow Automation', 'Basic', 6),
  ('maintenance', 'Maintenance', '2 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'web-application' AND p.slug = 'accelerate'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- Web App: Scale
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('user_roles', 'User Roles', 'Up to 10', 1),
  ('authentication', 'Authentication', '✓', 2),
  ('dashboard', 'Dashboard', '✓', 3),
  ('admin_panel', 'Admin Panel', '✓', 4),
  ('api_integrations', 'API Integrations', 'Up to 10', 5),
  ('workflow', 'Workflow Automation', 'Advanced', 6),
  ('maintenance', 'Maintenance', '3 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'web-application' AND p.slug = 'scale'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- Web App: Transform
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('user_roles', 'User Roles', 'Unlimited', 1),
  ('authentication', 'Authentication', '✓', 2),
  ('dashboard', 'Dashboard', '✓', 3),
  ('admin_panel', 'Admin Panel', '✓', 4),
  ('api_integrations', 'API Integrations', 'Unlimited', 5),
  ('workflow', 'Workflow Automation', 'Enterprise', 6),
  ('maintenance', 'Maintenance', '3 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'web-application' AND p.slug = 'transform'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- Mobile: Launch Mobile
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('platforms', 'Platforms', 'Android or iOS', 1),
  ('ui_ux', 'UI/UX', 'Standard', 2),
  ('login', 'Login & Registration', '✓', 3),
  ('push_notifications', 'Push Notifications', '✓', 4),
  ('offline_mode', 'Offline Mode', '—', 5),
  ('payment_gateway', 'Payment Gateway', 'Optional', 6),
  ('support', 'Support', '2 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'mobile-application' AND p.slug = 'launch'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- Mobile: Growth Mobile
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('platforms', 'Platforms', 'Android + iOS', 1),
  ('ui_ux', 'UI/UX', 'Premium', 2),
  ('login', 'Login & Registration', '✓', 3),
  ('push_notifications', 'Push Notifications', '✓', 4),
  ('offline_mode', 'Offline Mode', '✓', 5),
  ('payment_gateway', 'Payment Gateway', '✓', 6),
  ('support', 'Support', '3 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'mobile-application' AND p.slug = 'growth'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- Mobile: Enterprise Mobile
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('platforms', 'Platforms', 'Android + iOS', 1),
  ('ui_ux', 'UI/UX', 'Enterprise', 2),
  ('login', 'Login & Registration', '✓', 3),
  ('push_notifications', 'Push Notifications', '✓', 4),
  ('offline_mode', 'Offline Mode', '✓', 5),
  ('payment_gateway', 'Payment Gateway', '✓', 6),
  ('support', 'Support', '3 Months', 7)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'mobile-application' AND p.slug = 'enterprise'
ON CONFLICT (package_id, feature_key) DO NOTHING;
