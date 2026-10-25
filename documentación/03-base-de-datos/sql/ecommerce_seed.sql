-- =====================================================================
--  E-COMMERCE · Datos de ejemplo de Almacén (opcional, solo desarrollo)
--  Ejecutar DESPUÉS de ecommerce_schema.sql
--  ⚠️ BORRA el catálogo y los cupones existentes antes de cargarlos.
--     Aborta si ya hay pedidos, para no tocar datos reales.
--  Coherente con el diseño: categorías del menú, 12 productos ("Mostrando 8 de 12"),
--  variantes con stock bajo y una agotada, imágenes 4:5. Marcas, productos y precios
--  son ficticios.
-- =====================================================================

do $$ begin
  if exists (select 1 from public.orders) then
    raise exception 'Hay pedidos en la base de datos: este seed no se ejecuta';
  end if;
end $$;

-- 1. Limpiar el seed anterior (variantes, imágenes y reseñas caen en cascada)
delete from public.coupons;
delete from public.products;
delete from public.brands;
delete from public.categories;

-- 2. Categorías del menú del diseño (Novedades y Ofertas son listados, no categorías)
insert into public.categories (name, slug, description, sort_order, image_url) values
  ('Cerámica',        'ceramica',        'Tazas, platos y fuentes hechos a mano.',          1, 'https://placehold.co/1200x1500/ece8df/5c564d?text=Cer%C3%A1mica'),
  ('Textiles',        'textiles',        'Mantas, cojines y paños de algodón y lana.',      2, 'https://placehold.co/1200x1500/ece8df/5c564d?text=Textiles'),
  ('Velas y aromas',  'velas-y-aromas',  'Velas de cera de soya y difusores.',              3, 'https://placehold.co/1200x1500/ece8df/5c564d?text=Velas'),
  ('Cocina',          'cocina',          'Utensilios de madera, tablas y frascos.',         4, 'https://placehold.co/1200x1500/ece8df/5c564d?text=Cocina');

-- 3. Marcas
insert into public.brands (name, slug) values
  ('Cerámica del Sur', 'ceramica-del-sur'),
  ('Telar Andino',     'telar-andino'),
  ('Cera Viva',        'cera-viva'),
  ('Mesa Larga',       'mesa-larga');

-- 4. Productos (12, como el "Mostrando 8 de 12" del listado). Precios en CLP enteros.
insert into public.products
  (category_id, brand_id, name, slug, description, base_price, compare_at_price, is_featured, metadata)
select c.id, b.id, p.name, p.slug, p.description, p.base_price, p.compare_at_price, p.is_featured, p.metadata::jsonb
from (values
  ('ceramica', 'ceramica-del-sur', 'Taza de gres esmaltado', 'taza-de-gres-esmaltado',
   'Gres cocido a alta temperatura, apto para lavavajillas. Cada pieza tiene pequeñas variaciones de color.',
   12490, null::numeric, true,
   '{"material":"Gres esmaltado","capacidad":"350 ml","medidas":"9 × 8 cm","cuidado":"Apta para lavavajillas y microondas","origen":"Hecha a mano en Pomaire"}'),
  ('ceramica', 'ceramica-del-sur', 'Plato hondo de gres', 'plato-hondo-de-gres',
   'Plato hondo de borde irregular para sopas y ensaladas.',
   14990, null, false,
   '{"material":"Gres esmaltado","capacidad":"600 ml","medidas":"20 cm de diámetro","cuidado":"Apto para lavavajillas","origen":"Hecho a mano en Pomaire"}'),
  ('ceramica', 'ceramica-del-sur', 'Fuente ovalada para horno', 'fuente-ovalada-para-horno',
   'Fuente de gres que va del horno a la mesa.',
   27990, 34990, false,
   '{"material":"Gres","medidas":"32 × 22 cm","cuidado":"Apta para horno hasta 250 °C","origen":"Hecha a mano en Pomaire"}'),
  ('ceramica', 'ceramica-del-sur', 'Florero de greda', 'florero-de-greda',
   'Florero de greda natural con acabado mate.',
   19990, null, false,
   '{"material":"Greda","medidas":"24 cm de alto","cuidado":"Limpiar con paño húmedo","origen":"Hecho a mano en Quinchamalí"}'),
  ('textiles', 'telar-andino', 'Manta de lana tejida', 'manta-de-lana-tejida',
   'Manta tejida a telar con lana de oveja. Abriga sin pesar.',
   39990, 52990, true,
   '{"material":"Lana de oveja","medidas":"130 × 180 cm","cuidado":"Lavado en seco","origen":"Tejida en Chiloé"}'),
  ('textiles', 'telar-andino', 'Cojín de lino', 'cojin-de-lino',
   'Funda de lino lavado con relleno de fibra.',
   16990, 21990, false,
   '{"material":"Lino","medidas":"45 × 45 cm","cuidado":"Funda lavable a máquina en frío"}'),
  ('textiles', 'telar-andino', 'Set de paños de cocina', 'set-de-panos-de-cocina',
   'Tres paños de algodón grueso que secan bien.',
   9990, null, false,
   '{"material":"Algodón","medidas":"50 × 70 cm (3 unidades)","cuidado":"Lavable a máquina"}'),
  ('velas-y-aromas', 'cera-viva', 'Vela de soya en frasco', 'vela-de-soya-en-frasco',
   'Vela de cera de soya con mecha de algodón. Dura cerca de 40 horas.',
   11990, null, true,
   '{"material":"Cera de soya y vidrio","medidas":"8 × 9 cm","duracion":"40 horas","cuidado":"Cortar la mecha a 5 mm antes de encender"}'),
  ('velas-y-aromas', 'cera-viva', 'Difusor de varillas', 'difusor-de-varillas',
   'Difusor con aceites esenciales y varillas de ratán.',
   18990, null, false,
   '{"material":"Vidrio y ratán","capacidad":"100 ml","duracion":"Hasta 8 semanas"}'),
  ('cocina', 'mesa-larga', 'Tabla de raulí para picar', 'tabla-de-rauli-para-picar',
   'Tabla de madera nativa con canal para jugos.',
   24990, null, true,
   '{"material":"Raulí","medidas":"40 × 25 × 2 cm","cuidado":"Lavar a mano y aceitar cada mes"}'),
  ('cocina', 'mesa-larga', 'Set de cucharas de madera', 'set-de-cucharas-de-madera',
   'Cuatro cucharas talladas en madera de olivo.',
   12990, 15990, false,
   '{"material":"Olivo","medidas":"25 a 30 cm","cuidado":"Lavar a mano"}'),
  ('cocina', 'mesa-larga', 'Frasco de vidrio con tapa de madera', 'frasco-de-vidrio-con-tapa',
   'Frasco hermético para legumbres, café o harina.',
   7990, null, false,
   '{"material":"Vidrio y madera de haya","capacidad":"1 litro","cuidado":"Vidrio apto para lavavajillas; tapa a mano"}')
) as p(category_slug, brand_slug, name, slug, description, base_price, compare_at_price, is_featured, metadata)
join public.categories c on c.slug = p.category_slug
join public.brands     b on b.slug = p.brand_slug;

-- 5. Variantes. attributes usa claves en español ("color", "talla").
--    Incluye stock bajo (≤ 3) y una variante agotada para probar el diseño.
insert into public.product_variants (product_id, sku, name, attributes, price, stock, weight_grams)
select pr.id, v.sku, v.name, v.attributes::jsonb, v.price, v.stock, v.weight
from (values
  ('taza-de-gres-esmaltado',    'CER-TAZ-ARE', 'Arena',       '{"color":"Arena"}',   null::numeric, 18, 350),
  ('taza-de-gres-esmaltado',    'CER-TAZ-PIN', 'Verde pino',  '{"color":"Verde pino"}', null,       2, 350),
  ('taza-de-gres-esmaltado',    'CER-TAZ-TER', 'Terracota',   '{"color":"Terracota"}', null,        0, 350),
  ('plato-hondo-de-gres',       'CER-PLA-ARE', 'Arena',       '{"color":"Arena"}',   null,         12, 600),
  ('plato-hondo-de-gres',       'CER-PLA-PIN', 'Verde pino',  '{"color":"Verde pino"}', null,       8, 600),
  ('fuente-ovalada-para-horno', 'CER-FUE-UNI', 'Única',       '{}',                  null,          5, 1800),
  ('florero-de-greda',          'CER-FLO-UNI', 'Única',       '{}',                  null,          3, 900),
  ('manta-de-lana-tejida',      'TEX-MAN-CRU', 'Crudo',       '{"color":"Crudo"}',   null,          6, 1200),
  ('manta-de-lana-tejida',      'TEX-MAN-GRA', 'Grafito',     '{"color":"Grafito"}', null,          4, 1200),
  ('cojin-de-lino',             'TEX-COJ-ARE', 'Arena',       '{"color":"Arena"}',   null,         10, 500),
  ('cojin-de-lino',             'TEX-COJ-OLI', 'Oliva',       '{"color":"Oliva"}',   null,          1, 500),
  ('set-de-panos-de-cocina',    'TEX-PAN-UNI', 'Única',       '{}',                  null,         25, 300),
  ('vela-de-soya-en-frasco',    'VEL-SOY-HIG', 'Higo',        '{"aroma":"Higo"}',    null,         20, 400),
  ('vela-de-soya-en-frasco',    'VEL-SOY-ROM', 'Romero',      '{"aroma":"Romero"}',  null,         15, 400),
  ('difusor-de-varillas',       'VEL-DIF-UNI', 'Única',       '{}',                  null,          9, 350),
  ('tabla-de-rauli-para-picar', 'COC-TAB-M',   'Mediana',     '{"talla":"M"}',       null,          7, 1100),
  ('tabla-de-rauli-para-picar', 'COC-TAB-L',   'Grande',      '{"talla":"L"}',       32990,         3, 1600),
  ('set-de-cucharas-de-madera', 'COC-CUC-UNI', 'Única',       '{}',                  null,         14, 250),
  ('frasco-de-vidrio-con-tapa', 'COC-FRA-1L',  '1 litro',     '{"capacidad":"1 L"}', null,         30, 700),
  ('frasco-de-vidrio-con-tapa', 'COC-FRA-2L',  '2 litros',    '{"capacidad":"2 L"}', 10990,        12, 1100)
) as v(product_slug, sku, name, attributes, price, stock, weight)
join public.products pr on pr.slug = v.product_slug;

-- 6. Imágenes placeholder en 4:5 (1200 × 1500), como pide el diseño
insert into public.product_images (product_id, url, alt, sort_order)
select id,
       'https://placehold.co/1200x1500/ece8df/5c564d?text=' || replace(name, ' ', '+'),
       name,
       0
from public.products;

-- 7. Cupones de prueba (los mismos del seed anterior)
insert into public.coupons (code, description, discount_type, value, min_order_amount, max_uses_per_user) values
  ('BIENVENIDA10',  '10% en tu primera compra',         'percentage', 10,   0,     1),
  ('DESCUENTO5000', '$5.000 en compras sobre $30.000',  'fixed',      5000, 30000, null);
