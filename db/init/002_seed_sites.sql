INSERT INTO sites (site_key, site_name, domain, timezone)
VALUES
  ('pcyid', 'PCYID', 'www.pcyid.store', 'Asia/Shanghai'),
  ('ydzid', 'YDZID', 'www.ydzid.store', 'Asia/Shanghai'),
  ('qsid', 'QSID', 'www.qsid.store', 'Asia/Shanghai'),
  ('wzx', 'WZX', '', 'Asia/Shanghai')
ON CONFLICT (site_key) DO NOTHING;
