-- ============================================================================
-- REQUESTLUXURY.COM — SHOWCASE SEED DATA
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql. Safe to re-run: every row is upserted, and re-running
-- restarts the two showcase auctions.
--
-- Everything here is fictional and flagged is_showcase = true, so the site
-- labels it "Showcase": six partner dealers, 18 listings (3 per vertical) and
-- three house sponsor banners. Photography is from Unsplash (free licence).
-- Archive the showcase rows from /admin/listings once real inventory is live.
-- ============================================================================

create or replace function pg_temp.u(p_id text)
returns text language sql immutable as $$
  select 'https://images.unsplash.com/photo-' || p_id || '?auto=format&fit=crop&w=1600&q=80';
$$;

-- ----------------------------------------------------------------------------
-- Showcase partner dealers (enquiries route to the concierge inbox)
-- ----------------------------------------------------------------------------
insert into public.dealers
  (id, company_name, slug, vertical_focus, country, city, contact_email, contact_name,
   rera_orn_number, subscription_tier, is_verified, status, is_showcase)
values
  ('a0000000-0000-4000-8000-000000000001', 'Maison Verelle Estates',      'maison-verelle-estates',      'residences', 'United Arab Emirates', 'Dubai',   'concierge@requestluxury.com', 'Showcase Desk', 'SHOWCASE-ORN', 'founding_free', true, 'approved', true),
  ('a0000000-0000-4000-8000-000000000002', 'Scuderia Alvane',             'scuderia-alvane',             'supercars',  'Monaco',               'Monaco',  'concierge@requestluxury.com', 'Showcase Desk', null,           'founding_free', true, 'approved', true),
  ('a0000000-0000-4000-8000-000000000003', 'Thalassa Meridian Yachts',    'thalassa-meridian-yachts',    'yachts',     'France',               'Antibes', 'concierge@requestluxury.com', 'Showcase Desk', null,           'founding_free', true, 'approved', true),
  ('a0000000-0000-4000-8000-000000000004', 'Aerovelle Jet Partners',      'aerovelle-jet-partners',      'aviation',   'Switzerland',          'Geneva',  'concierge@requestluxury.com', 'Showcase Desk', null,           'founding_free', true, 'approved', true),
  ('a0000000-0000-4000-8000-000000000005', 'Chronovane Fine Timepieces',  'chronovane-fine-timepieces',  'horology',   'United Kingdom',       'London',  'concierge@requestluxury.com', 'Showcase Desk', null,           'founding_free', true, 'approved', true),
  ('a0000000-0000-4000-8000-000000000006', 'Seravine Haute Joaillerie',   'seravine-haute-joaillerie',   'jewelry',    'Belgium',              'Antwerp', 'concierge@requestluxury.com', 'Showcase Desk', null,           'founding_free', true, 'approved', true)
on conflict (id) do update set
  company_name = excluded.company_name, slug = excluded.slug, vertical_focus = excluded.vertical_focus,
  country = excluded.country, city = excluded.city, contact_email = excluded.contact_email,
  contact_name = excluded.contact_name, rera_orn_number = excluded.rera_orn_number,
  is_verified = excluded.is_verified, status = excluded.status, is_showcase = excluded.is_showcase;

-- ----------------------------------------------------------------------------
-- 18 showcase listings
-- ----------------------------------------------------------------------------
insert into public.listings
  (dealer_id, title, slug, vertical, description, price_usd, display_currency, price_on_request,
   sale_mode, deposit_amount_usd, country, city, exact_address, property_status, trakheesi_permit_number,
   images, deal_room_docs, specs, auction_end_time, starting_bid_usd, reserve_price_usd,
   is_featured, moderation_status, is_showcase)
values

-- ============================== RESIDENCES ==================================
('a0000000-0000-4000-8000-000000000001',
 'Signature Waterfront Villa on Palm Jumeirah',
 'signature-waterfront-villa-palm-jumeirah', 'residences',
 'Set on one of the most private fronds of Palm Jumeirah, this contemporary waterfront villa unfolds across three floors of travertine, bronze and full-height glazing. The ground floor opens entirely to a 25-metre infinity pool and private beach, with skyline views across the water to Dubai Marina.

Inside, a double-height reception leads to a show kitchen with a separate chef''s kitchen, a formal dining room and a private cinema. The principal suite occupies its own wing with a dressing gallery and a malachite-clad bathroom; five further en-suite bedrooms, staff quarters, a gym and a four-car garage complete the house. Offered fully furnished and ready to occupy.',
 28500000, 'AED', false, 'inquire_only', 0,
 'United Arab Emirates', 'Dubai', 'Showcase residence, Frond N, Palm Jumeirah, Dubai',
 'ready_built', 'SHOWCASE-PERMIT-0001',
 array[pg_temp.u('1781795414968-8ece31826420'), pg_temp.u('1759238136854-a43787126db7'), pg_temp.u('1758448755927-e5c5ae14790c'),
       pg_temp.u('1785402231092-859d0a6c4397'), pg_temp.u('1766733041960-0de62f403e7b'), pg_temp.u('1754447628644-b2dc91ce3237'),
       pg_temp.u('1699134825683-724944b280b8'), pg_temp.u('1793613345082-8397856e363c')],
 '[{"title":"Floor plans — all levels","kind":"floorplan","access":"registered","url":"/deal-room/samples/showcase-floorplan.pdf"},
   {"title":"Technical specification & finishes schedule","kind":"specification","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"},
   {"title":"Title & ownership summary","kind":"legal","access":"verified","url":"/deal-room/samples/showcase-provenance-statement.pdf"}]'::jsonb,
 '{"bedrooms":6,"bathrooms":8,"interior_sqft":14200,"plot_sqft":18500,"year_built":2023,"view":"Open sea & Marina skyline","furnishing":"Fully furnished","parking":"4-car garage","pool":"25 m infinity pool","beach":"Private beach frontage"}'::jsonb,
 null, 0, 0, true, 'approved', true),

('a0000000-0000-4000-8000-000000000001',
 'Full-Floor Penthouse with Manhattan Skyline Views',
 'full-floor-penthouse-manhattan-skyline', 'residences',
 'A full-floor residence high above Midtown East, with uninterrupted views south to the Empire State Building and east across the river. A private elevator landing opens to a 50-foot great room wrapped in floor-to-ceiling glass, with a wood-burning fireplace and a formal dining area for twelve.

The corner principal suite has dual dressing rooms and a stone bathroom with a freestanding tub set against the skyline. Three further bedroom suites, a library, a windowed kitchen with a breakfast room and a staff suite complete the plan. The white-glove building offers a 24-hour doorman, a private dining room, a 20-metre pool and on-site parking.',
 21750000, 'USD', false, 'inquire_only', 0,
 'United States', 'New York', 'Showcase residence, Midtown East, Manhattan, New York',
 'ready_built', null,
 array[pg_temp.u('1704026437995-a4c44a5ebc1a'), pg_temp.u('1757862351841-c6f7ac0b0201'), pg_temp.u('1663811397443-2d058a628295'),
       pg_temp.u('1786553450386-ab62ff2e140e'), pg_temp.u('1737712374342-da1db894a397'), pg_temp.u('1741282698789-d3529b361c92'),
       pg_temp.u('1667035100694-ff123f76f17d'), pg_temp.u('1750073473331-fe4165aa3030')],
 '[{"title":"Floor plan — full floor","kind":"floorplan","access":"registered","url":"/deal-room/samples/showcase-floorplan.pdf"},
   {"title":"Building & carrying-cost summary","kind":"specification","access":"verified","url":"/deal-room/samples/showcase-technical-specification.pdf"}]'::jsonb,
 '{"bedrooms":4,"bathrooms":5,"interior_sqft":6850,"floor":"Full floor, high level","year_built":2019,"view":"Empire State Building & East River","building_services":"24-hour doorman, pool, private dining","parking":"On-site, by arrangement"}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000001',
 'Contemporary Sea-View Villa on Marbella''s Golden Mile',
 'contemporary-sea-view-villa-marbella-golden-mile', 'residences',
 'A crisp white contemporary villa in a gated enclave of Marbella''s Golden Mile, a short walk from the beach clubs and ten minutes from Puerto Banús. South-facing terraces on every level look over mature gardens and a heated saltwater pool to the Mediterranean.

The open-plan ground floor combines living, dining and a bespoke kitchen behind sliding glass walls. Five bedroom suites are arranged over two floors, the principal with its own terrace and outdoor shower. The lower level holds a spa with hammam, a wine room, a games room and garaging for three cars. Sold with a full home-automation system and underfloor heating throughout.',
 7950000, 'EUR', false, 'inquire_only', 0,
 'Spain', 'Marbella', 'Showcase residence, Golden Mile, Marbella, Málaga',
 'ready_built', null,
 array[pg_temp.u('1613977257592-4871e5fcd7c4'), pg_temp.u('1747336754870-ca7b10cc75f5'), pg_temp.u('1770941633927-b7a15557e0e1'),
       pg_temp.u('1741287541112-78c8507e745d'), pg_temp.u('1722858810036-e917b4dd3f3f'), pg_temp.u('1717167398817-121e3c283dbb')],
 '[{"title":"Floor plans","kind":"floorplan","access":"registered","url":"/deal-room/samples/showcase-floorplan.pdf"}]'::jsonb,
 '{"bedrooms":5,"bathrooms":6,"interior_sqft":7400,"plot_sqft":16100,"year_built":2021,"view":"Mediterranean Sea","pool":"Heated saltwater pool","parking":"3-car garage","extras":"Spa with hammam, wine room"}'::jsonb,
 null, 0, 0, false, 'approved', true),

-- ============================== SUPERCARS ===================================
('a0000000-0000-4000-8000-000000000002',
 'Lamborghini Huracán EVO Spyder in Arancio Xanto',
 'lamborghini-huracan-evo-spyder-arancio-xanto', 'supercars',
 'A one-owner Huracán EVO Spyder finished in pearl-effect Arancio Xanto over Nero Ade leather with orange contrast stitching. The naturally aspirated 5.2-litre V10 produces 640 hp, driving all four wheels through the seven-speed dual-clutch gearbox, with rear-wheel steering and torque vectoring as standard.

Specified with the Style Package, 20-inch Aesir forged wheels, carbon-ceramic brakes with orange calipers, front lift, Sensonum audio and the smartphone interface. Supplied with a full main-dealer service history, both keys, the factory car cover and battery conditioner. A refundable hold deposit reserves the car for 72 hours pending inspection.',
 329000, 'EUR', false, 'hold_deposit', 5000,
 'Monaco', 'Monaco', 'Showcase vehicle, held in a private collection, Fontvieille, Monaco',
 'not_applicable', null,
 array[pg_temp.u('1783822841230-3c443072565e'), pg_temp.u('1783819218542-be829bb733ed'), pg_temp.u('1783819218470-858bf6ef52c8'),
       pg_temp.u('1783822841263-3d581651de3c'), pg_temp.u('1783822841222-b989ffb0071d'), pg_temp.u('1779184604075-b85998ec6608')],
 '[{"title":"Service history & specification sheet","kind":"provenance","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"}]'::jsonb,
 '{"year":2022,"make":"Lamborghini","model":"Huracán EVO Spyder","mileage_km":6200,"engine":"5.2 L V10","power_hp":640,"transmission":"7-speed dual-clutch","drive":"All-wheel drive","exterior":"Arancio Xanto","interior":"Nero Ade leather","owners":1}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000002',
 'Porsche 911 GT3 RS with Weissach Package',
 'porsche-911-gt3-rs-weissach-package', 'supercars',
 'A delivery-mileage 992-generation 911 GT3 RS in White with Pyro Red accents, ordered with the Weissach Package. The 4.0-litre naturally aspirated flat-six revs to 9,000 rpm and produces 525 hp, paired with the seven-speed PDK and the fully adjustable DRS rear wing that defines this generation.

The Weissach Package adds exposed carbon-fibre for the bonnet, roof, wing elements and anti-roll bars, with magnesium wheels and a carbon roll cage. Further options include PCCB ceramic brakes, front-axle lift, the Chrono Package and Bose audio. Covered by the balance of the manufacturer warranty and available for immediate purchase.',
 412000, 'GBP', false, 'direct_buy', 0,
 'United Kingdom', 'London', 'Showcase vehicle, stored in a climate-controlled facility, West London',
 'not_applicable', null,
 array[pg_temp.u('1777965758053-d6e0b6fef4ce'), pg_temp.u('1741345701055-b3e21f336bde'), pg_temp.u('1743889292268-2e9f58a73fa3'),
       pg_temp.u('1780653431658-7430f8b492a9'), pg_temp.u('1776163803125-86564fd5b2f6'), pg_temp.u('1753624160009-05d94d1b0677')],
 '[]'::jsonb,
 '{"year":2024,"make":"Porsche","model":"911 GT3 RS (992)","mileage_km":480,"engine":"4.0 L flat-six","power_hp":525,"transmission":"7-speed PDK","drive":"Rear-wheel drive","exterior":"White with Pyro Red","interior":"Black Race-Tex","owners":1}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000002',
 '1955 Mercedes-Benz 300 SL Gullwing',
 '1955-mercedes-benz-300-sl-gullwing', 'supercars',
 'One of the great post-war motor cars, offered at timed auction. This 1955 300 SL Gullwing is presented in its original colour combination of Silver Grey Metallic over red leather, with the fitted luggage, tool roll and Becker radio that collectors look for.

The car was restored by a marque specialist, with the direct-injection 3.0-litre straight-six rebuilt to factory tolerances and the tubular spaceframe inspected and refinished. It has since been shown at concours level and used sparingly on historic rallies. The history file, with restoration invoices and photographs, is available to registered bidders in the deal room.',
 1650000, 'CHF', false, 'timed_auction', 0,
 'Switzerland', 'Geneva', 'Showcase vehicle, held in bonded storage, Geneva Freeport',
 'not_applicable', null,
 array[pg_temp.u('1772550329007-dab7bd05ae27'), pg_temp.u('1783673874212-32a829bf0a0a'), pg_temp.u('1783673874267-bae0d37a9b39'),
       pg_temp.u('1783673874161-efeeb41cee9d'), pg_temp.u('1772549411001-3afe8e8f87b0'), pg_temp.u('1783673874234-eae7f0cfc067'),
       pg_temp.u('1772050495319-0f45b59e46cf')],
 '[{"title":"Provenance statement & ownership chain","kind":"provenance","access":"registered","url":"/deal-room/samples/showcase-provenance-statement.pdf"},
   {"title":"Independent condition report","kind":"inspection","access":"verified","url":"/deal-room/samples/showcase-condition-report.pdf"}]'::jsonb,
 '{"year":1955,"make":"Mercedes-Benz","model":"300 SL Gullwing (W198)","mileage_km":61400,"engine":"3.0 L straight-six, direct injection","power_hp":215,"transmission":"4-speed manual","exterior":"Silver Grey Metallic","interior":"Red leather","matching_numbers":"Yes"}'::jsonb,
 now() + interval '3 days 5 hours', 950000, 1400000, true, 'approved', true),

-- ================================ YACHTS ====================================
('a0000000-0000-4000-8000-000000000003',
 '55m Tri-Deck Explorer Superyacht',
 '55m-tri-deck-explorer-superyacht', 'yachts',
 'A steel-hulled, ice-strengthened explorer yacht built for long-range cruising in complete comfort. Accommodation is for twelve guests in six suites, including a full-beam owner''s apartment on the main deck with a private study and fold-down balcony, cared for by a crew of thirteen.

The sun deck carries a spa pool, bar and gym; the bridge deck aft is arranged for dining under the stars. A certified helideck, two custom tenders and a complete dive store support genuine expedition use, with a transatlantic range of 5,500 nautical miles at 12 knots. Recently refitted, with class surveys up to date. Price on application to qualified buyers.',
 38500000, 'EUR', true, 'inquire_only', 0,
 'Monaco', 'Monaco', 'Showcase yacht, berthed at Port Hercule, Monaco',
 'not_applicable', null,
 array[pg_temp.u('1569263979104-865ab7cd8d13'), pg_temp.u('1727786847949-dd24e7cc6bd4'), pg_temp.u('1783686664022-1b3149c56e9f'),
       pg_temp.u('1693869981101-c9a2bcfbdc92'), pg_temp.u('1775736310547-5d502fbcf805'), pg_temp.u('1773594559238-1f4bcf8672a8')],
 '[{"title":"General arrangement & specification","kind":"specification","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"},
   {"title":"Latest survey summary","kind":"inspection","access":"verified","url":"/deal-room/samples/showcase-condition-report.pdf"}]'::jsonb,
 '{"year":2018,"refit":2024,"length_m":55,"beam_m":9.6,"guests":12,"cabins":6,"crew":13,"cruising_speed_kn":12,"range_nm":5500,"hull":"Steel, ice-strengthened","flag":"Cayman Islands"}'::jsonb,
 null, 0, 0, true, 'approved', true),

('a0000000-0000-4000-8000-000000000003',
 '34m Fast-Displacement Sport Yacht',
 '34m-fast-displacement-sport-yacht', 'yachts',
 'A low-profile aluminium sport yacht with a fast-displacement hull, combining a 26-knot top speed with an efficient 1,800-nautical-mile range at cruising speed. Full-height glazing and a single-level main deck give the saloon an unusually close connection to the water.

Ten guests are accommodated in five cabins, with the owner''s suite forward on the main deck. The beach club opens on three sides and stores a 6-metre tender and two personal watercraft. Zero-speed stabilisers, a hybrid hotel mode for silent nights at anchor and an owner-operator layout make her equally suited to private use and charter. A refundable hold deposit secures a sea trial slot.',
 9800000, 'EUR', false, 'hold_deposit', 25000,
 'France', 'Antibes', 'Showcase yacht, berthed at Port Vauban, Antibes',
 'not_applicable', null,
 array[pg_temp.u('1779987680720-ca6e1b6fb4b0'), pg_temp.u('1793102468904-142665682527'), pg_temp.u('1729955139071-0316d031105b'),
       pg_temp.u('1774579891903-b48c080536b5')],
 '[{"title":"Specification & inventory","kind":"specification","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"}]'::jsonb,
 '{"year":2022,"length_m":34,"beam_m":7.4,"guests":10,"cabins":5,"crew":6,"max_speed_kn":26,"cruising_speed_kn":18,"range_nm":1800,"hull":"Aluminium","flag":"Malta"}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000003',
 '32m Classic Sailing Ketch',
 '32m-classic-sailing-ketch', 'yachts',
 'A thoroughbred ketch with a dark hull, sweeping sheer and teak decks, built for fast and comfortable passage-making under sail. The carbon rig carries in-boom furling on both masts, so she can be handled by a small crew, and she has logged several Atlantic crossings and Mediterranean regatta seasons.

Below decks the joinery is hand-finished mahogany, with an owner''s cabin aft, two guest cabins and separate crew quarters forward. The deck saloon gives all-round views at the dining table, and the cockpit is sheltered for long watches. Maintained without regard to cost by her current owner, with sails renewed and systems overhauled during her most recent winter refit.',
 4650000, 'EUR', false, 'inquire_only', 0,
 'Spain', 'Palma de Mallorca', 'Showcase yacht, berthed at Club de Mar, Palma de Mallorca',
 'not_applicable', null,
 array[pg_temp.u('1729349356555-bb8d857f2a4b'), pg_temp.u('1607510891430-020fff3e5549'), pg_temp.u('1545958140-244047d78f3a'),
       pg_temp.u('1757263024513-aa4c0d92b876'), pg_temp.u('1711415032202-e27a0bd35b81')],
 '[]'::jsonb,
 '{"year":2009,"refit":2025,"length_m":32,"beam_m":7.1,"guests":6,"cabins":3,"crew":4,"rig":"Ketch, carbon spars","hull":"Aluminium, teak decks","flag":"United Kingdom"}'::jsonb,
 null, 0, 0, false, 'approved', true),

-- =============================== AVIATION ===================================
('a0000000-0000-4000-8000-000000000004',
 'Gulfstream G650ER — Ultra-Long-Range Business Jet',
 'gulfstream-g650er-ultra-long-range', 'aviation',
 'An ultra-long-range flagship able to connect London with Singapore or Dubai with New York non-stop, cruising at Mach 0.90. This low-time example is configured for fourteen passengers across three living areas, with a forward club, a four-place conference group and an aft stateroom with a fixed divan and full lavatory.

The cabin features the lowest cabin altitude in its class, sixteen panoramic windows, Ka-band high-speed connectivity and a forward galley with a crew rest area. Engines and APU are enrolled on manufacturer programmes, and the aircraft has been hangared and operated privately since new. Full specification and records are released in the deal room; price on application.',
 54500000, 'USD', true, 'inquire_only', 0,
 'Switzerland', 'Geneva', 'Showcase aircraft, based at Geneva Airport (GVA) business aviation terminal',
 'not_applicable', null,
 array[pg_temp.u('1684838200815-36eef38f353c'), pg_temp.u('1770334618960-d246fc142297'), pg_temp.u('1772354838120-a78234bf7316'),
       pg_temp.u('1625513123245-fcb02d69ad12'), pg_temp.u('1767491629887-6fbe6eadf47f')],
 '[{"title":"Aircraft specification & equipment list","kind":"specification","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"},
   {"title":"Maintenance status summary","kind":"inspection","access":"verified","url":"/deal-room/samples/showcase-condition-report.pdf"}]'::jsonb,
 '{"year":2020,"manufacturer":"Gulfstream","model":"G650ER","total_time_hrs":1420,"passengers":14,"range_nm":7500,"max_speed":"Mach 0.925","engines":"2 × Rolls-Royce BR725","programmes":"Engines & APU enrolled","connectivity":"Ka-band Wi-Fi"}'::jsonb,
 null, 0, 0, true, 'approved', true),

('a0000000-0000-4000-8000-000000000004',
 'Bombardier Challenger 350 — Super-Midsize Jet',
 'bombardier-challenger-350-super-midsize', 'aviation',
 'The benchmark super-midsize jet, with a true flat-floor stand-up cabin and the range to fly London to Dubai or coast-to-coast across the United States. This aircraft seats nine in a double-club arrangement with a three-place divan, finished in ivory leather with dark walnut veneer.

Avionics are the Collins Pro Line 21 Advanced suite with synthetic vision, a head-up display and steep-approach certification, which opens airports such as London City. The engines are enrolled on an hourly maintenance programme and the aircraft is fresh from its 96-month inspection, with new paint and a refreshed interior completed at the same time.',
 16900000, 'USD', false, 'inquire_only', 0,
 'United Kingdom', 'London', 'Showcase aircraft, based at Farnborough Airport (FAB), Hampshire',
 'not_applicable', null,
 array[pg_temp.u('1783098269685-49990ec0f9c9'), pg_temp.u('1792500285805-8b9b8a9f00e0'), pg_temp.u('1585916788784-64aa099fec1f'),
       pg_temp.u('1767491629923-009ffdc395d8'), pg_temp.u('1784078183708-0e7b2dbbbdff')],
 '[{"title":"Aircraft specification","kind":"specification","access":"registered","url":"/deal-room/samples/showcase-technical-specification.pdf"}]'::jsonb,
 '{"year":2019,"manufacturer":"Bombardier","model":"Challenger 350","total_time_hrs":2150,"passengers":9,"range_nm":3200,"max_speed":"Mach 0.83","engines":"2 × Honeywell HTF7350","programmes":"Engines enrolled","avionics":"Collins Pro Line 21 Advanced"}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000004',
 'Airbus H130 — VIP Single-Engine Helicopter',
 'airbus-h130-vip-helicopter', 'aviation',
 'A VIP-configured H130 in gloss black, well suited to yacht support and coastal transfers along the Riviera. The wide, flat-floor cabin seats six passengers behind the pilot on energy-absorbing leather seats, with panoramic glazing and an active vibration control system that makes it one of the quietest cabins in its class.

The shrouded Fenestron tail rotor lowers the external noise signature and improves safety around passengers on the ground. Equipment includes a glass cockpit with a dual-channel FADEC, air conditioning, emergency floats, a cargo sling and a moving-map tablet system. Maintained by an approved service centre with complete logbooks; a refundable hold deposit reserves a viewing flight.',
 3450000, 'EUR', false, 'hold_deposit', 25000,
 'France', 'Nice', 'Showcase aircraft, hangared at Cannes-Mandelieu Airport (CEQ)',
 'not_applicable', null,
 array[pg_temp.u('1782207293091-cc6522bb83b6'), pg_temp.u('1782032162889-5c559b58aa55'), pg_temp.u('1746213952441-86bbbb2f6ec5'),
       pg_temp.u('1742931896676-97369bedd548'), pg_temp.u('1750232453291-8c01e816756a')],
 '[]'::jsonb,
 '{"year":2021,"manufacturer":"Airbus Helicopters","model":"H130","total_time_hrs":640,"passengers":6,"range_nm":330,"cruise_speed_kn":130,"engines":"1 × Safran Arriel 2D","equipment":"Air conditioning, emergency floats"}'::jsonb,
 null, 0, 0, false, 'approved', true),

-- =============================== HOROLOGY ===================================
('a0000000-0000-4000-8000-000000000005',
 'Rolex Submariner Date 126610LN — Full Set',
 'rolex-submariner-date-126610ln-full-set', 'horology',
 'The current-generation Submariner Date in Oystersteel with the black Cerachrom bezel, offered as a complete set in excellent condition. The 41 mm case houses the calibre 3235 with a 70-hour power reserve and Rolex''s Superlative Chronometer certification of plus or minus two seconds a day.

The watch retains crisp case lines and an unpolished finish, and the Oyster bracelet with Glidelock clasp has all its links. It is supplied with the inner and outer boxes, warranty card, booklets, both hang tags and the bezel protector. Authenticity is verified by our partner watchmaker before dispatch, and the watch ships fully insured with a signature required on delivery.',
 15400, 'GBP', false, 'direct_buy', 0,
 'United Kingdom', 'London', 'Showcase timepiece, held in insured vault storage, Mayfair, London',
 'not_applicable', null,
 array[pg_temp.u('1662384197911-e82189f4dc60'), pg_temp.u('1698612059734-280fed56f417'), pg_temp.u('1662384205880-2c7a9879cc0c'),
       pg_temp.u('1637718231776-382e68dc08df'), pg_temp.u('1611243705491-71487c2ed137'), pg_temp.u('1637718231806-729ecbb5c03e'),
       pg_temp.u('1558977908-c688c39850c9'), pg_temp.u('1637718231779-71de131273a4')],
 '[{"title":"Authentication & condition report","kind":"inspection","access":"registered","url":"/deal-room/samples/showcase-condition-report.pdf"}]'::jsonb,
 '{"brand":"Rolex","model":"Submariner Date","reference":"126610LN","year":2023,"case_material":"Oystersteel","case_diameter_mm":41,"movement":"Automatic, calibre 3235","water_resistance_m":300,"box_papers":"Full set","condition":"Excellent, unpolished"}'::jsonb,
 null, 0, 0, true, 'approved', true),

('a0000000-0000-4000-8000-000000000005',
 'Rolex Datejust 36 in Everose Rolesor with Diamond Dial',
 'rolex-datejust-36-everose-rolesor-diamond-dial', 'horology',
 'A Datejust 36 in Oystersteel and 18-carat Everose gold, offered at timed auction with a low opening bid. The chocolate sunray dial is set with ten factory diamond hour markers and framed by a fluted Everose bezel, on the five-link Jubilee bracelet with a concealed Crownclasp.

Inside is the calibre 3235 with a 70-hour power reserve. The watch was serviced within the last year by an accredited workshop and shows only light wear to the bracelet. It comes with its presentation box, warranty card and service papers. The winning bidder pays the hammer price plus the buyer''s premium, and the watch ships fully insured.',
 13500, 'CHF', false, 'timed_auction', 0,
 'Switzerland', 'Geneva', 'Showcase timepiece, held in insured vault storage, Geneva',
 'not_applicable', null,
 array[pg_temp.u('1773414685933-bfc3ccf89a3c'), pg_temp.u('1600003014755-ba31aa59c4b6'), pg_temp.u('1777457797327-571e21f193b0')],
 '[{"title":"Service record & authentication","kind":"provenance","access":"registered","url":"/deal-room/samples/showcase-provenance-statement.pdf"}]'::jsonb,
 '{"brand":"Rolex","model":"Datejust 36","reference":"126231","year":2021,"case_material":"Oystersteel & Everose gold","case_diameter_mm":36,"movement":"Automatic, calibre 3235","dial":"Chocolate, diamond-set","box_papers":"Box, card & service papers","condition":"Very good"}'::jsonb,
 now() + interval '1 day 8 hours', 6500, 9500, false, 'approved', true),

('a0000000-0000-4000-8000-000000000005',
 'Rolex Submariner Date 126613LB in Yellow Rolesor',
 'rolex-submariner-date-126613lb-yellow-rolesor', 'horology',
 'The two-tone Submariner Date in Oystersteel and 18-carat yellow gold, with the royal blue sunray dial and matching blue Cerachrom bezel. The 41 mm case and broader bracelet of the current generation give it a balanced presence on the wrist, powered by the calibre 3235.

This example is in very good condition with a sharp bezel and bright dial, and light desk wear to the polished centre links. It is offered with the warranty card and inner box. A refundable hold deposit reserves the watch for 48 hours while authentication is completed and the balance is arranged by bank transfer.',
 18900, 'AED', false, 'hold_deposit', 1000,
 'United Arab Emirates', 'Dubai', 'Showcase timepiece, held in insured vault storage, DIFC, Dubai',
 'not_applicable', null,
 array[pg_temp.u('1730757679771-b53e798846cf'), pg_temp.u('1670404160620-a3a86428560e')],
 '[]'::jsonb,
 '{"brand":"Rolex","model":"Submariner Date","reference":"126613LB","year":2022,"case_material":"Oystersteel & yellow gold","case_diameter_mm":41,"movement":"Automatic, calibre 3235","dial":"Royal blue","box_papers":"Card & inner box","condition":"Very good"}'::jsonb,
 null, 0, 0, false, 'approved', true),

-- ================================ JEWELRY ===================================
('a0000000-0000-4000-8000-000000000006',
 'Sapphire & Diamond Suite — Necklace and Pendant Earrings',
 'sapphire-diamond-suite-necklace-earrings', 'jewelry',
 'A matched suite of pear-shaped blue sapphires and brilliant-cut diamonds, mounted in platinum. The necklace is designed as a graduated line of diamond clusters suspending a detachable sapphire drop, which can also be worn as a pendant on a fine chain; the earrings echo the design with articulated sapphire drops.

The principal sapphires total approximately 31 carats and are accompanied by reports from an independent gemmological laboratory describing them as natural, with no indications of heating. The diamonds total approximately 24 carats, graded F–G colour and VS clarity. The suite is presented in a fitted case, and viewings are arranged privately by appointment.',
 186000, 'EUR', false, 'inquire_only', 0,
 'Belgium', 'Antwerp', 'Showcase jewel, held in insured vault storage, Antwerp Diamond Quarter',
 'not_applicable', null,
 array[pg_temp.u('1770722272510-ef28c6f57541'), pg_temp.u('1535632066927-ab7c9ab60908'), pg_temp.u('1780337092499-e8409dfaad83'),
       pg_temp.u('1767921482419-d2d255b5b700')],
 '[{"title":"Gemmological report summary","kind":"certificate","access":"registered","url":"/deal-room/samples/showcase-provenance-statement.pdf"},
   {"title":"Independent valuation","kind":"valuation","access":"verified","url":"/deal-room/samples/showcase-condition-report.pdf"}]'::jsonb,
 '{"type":"Necklace & earrings suite","metal":"Platinum","main_stone":"Blue sapphire","sapphire_carats":31,"diamond_carats":24,"diamond_colour":"F–G","diamond_clarity":"VS","certificate":"Independent laboratory reports","presentation":"Fitted case"}'::jsonb,
 null, 0, 0, true, 'approved', true),

('a0000000-0000-4000-8000-000000000006',
 '3.02ct Round Brilliant Diamond Halo Ring',
 '3-02ct-round-brilliant-diamond-halo-ring', 'jewelry',
 'A classic halo ring centred on a 3.02-carat round brilliant-cut diamond, graded F colour and VS1 clarity with excellent cut, polish and symmetry. The centre stone is held in a four-claw platinum setting, surrounded by a halo of micro-pavé diamonds that continues along the shoulders of the band.

The proportions of the centre stone give exceptional brilliance, and the laboratory report number is laser-inscribed on the girdle. The ring is a UK size M and can be resized by our workshop before delivery. A refundable hold deposit reserves the ring while a private viewing or an independent appraisal is arranged.',
 48500, 'GBP', false, 'hold_deposit', 2500,
 'United Kingdom', 'London', 'Showcase jewel, held in insured vault storage, Hatton Garden, London',
 'not_applicable', null,
 array[pg_temp.u('1677768061375-cd600727e274'), pg_temp.u('1700157310006-a3a2f7c8d6ef'), pg_temp.u('1673823258465-d9160aa4ed63')],
 '[{"title":"Diamond grading report","kind":"certificate","access":"registered","url":"/deal-room/samples/showcase-provenance-statement.pdf"}]'::jsonb,
 '{"type":"Engagement ring","metal":"Platinum","main_stone":"Diamond","carat_weight":3.02,"cut":"Round brilliant","colour":"F","clarity":"VS1","certificate":"Independent laboratory report","ring_size":"UK M / US 6¼"}'::jsonb,
 null, 0, 0, false, 'approved', true),

('a0000000-0000-4000-8000-000000000006',
 'Diamond Fringe Necklace with Chandelier Earrings',
 'diamond-fringe-necklace-chandelier-earrings', 'jewelry',
 'An evening parure in 18-carat white gold: a fringe necklace of marquise and round brilliant-cut diamonds, with a pair of matching chandelier earrings. The necklace sits close to the collarbone and is fully articulated, so it moves with the wearer and catches the light from every angle.

The diamonds total approximately 18 carats across the set and are well matched for colour and brightness. Both pieces are in excellent condition, having been professionally cleaned and checked by our workshop, and are supplied in a presentation case with an independent valuation for insurance. Available for immediate purchase with insured delivery.',
 28500, 'EUR', false, 'direct_buy', 0,
 'France', 'Paris', 'Showcase jewel, held in insured vault storage, Place Vendôme, Paris',
 'not_applicable', null,
 array[pg_temp.u('1707222609380-fe23be31c883'), pg_temp.u('1707222609449-89d5b27b768b'), pg_temp.u('1665159882377-385d68d2bdff')],
 '[]'::jsonb,
 '{"type":"Necklace & earrings parure","metal":"18ct white gold","main_stone":"Diamond","carat_weight":18,"cut":"Marquise & round brilliant","colour":"G–H","clarity":"VS–SI","certificate":"Independent valuation","presentation":"Presentation case"}'::jsonb,
 null, 0, 0, false, 'approved', true)

on conflict (slug) do update set
  dealer_id = excluded.dealer_id, title = excluded.title, vertical = excluded.vertical,
  description = excluded.description, price_usd = excluded.price_usd,
  display_currency = excluded.display_currency, price_on_request = excluded.price_on_request,
  sale_mode = excluded.sale_mode, deposit_amount_usd = excluded.deposit_amount_usd,
  country = excluded.country, city = excluded.city, exact_address = excluded.exact_address,
  property_status = excluded.property_status, trakheesi_permit_number = excluded.trakheesi_permit_number,
  images = excluded.images, deal_room_docs = excluded.deal_room_docs, specs = excluded.specs,
  auction_end_time = excluded.auction_end_time, starting_bid_usd = excluded.starting_bid_usd,
  reserve_price_usd = excluded.reserve_price_usd, is_featured = excluded.is_featured,
  moderation_status = excluded.moderation_status, is_showcase = excluded.is_showcase;

-- ----------------------------------------------------------------------------
-- House sponsor banners (RequestLuxury's own concierge desks)
-- ----------------------------------------------------------------------------
insert into public.sponsors
  (name, slug, headline, body, cta_label, target_url, image_url, verticals, is_active, contact_email)
values
  ('RequestLuxury Private Aviation Desk', 'private-aviation-desk',
   'Wheels up, wherever the next viewing is',
   'Charter a light jet for a day trip or a long-range aircraft for a multi-city tour. One request reaches our aviation desk, with quotes returned the same day.',
   'Request a charter quote', '/concierge/private-jet-charter',
   pg_temp.u('1792500285805-8b9b8a9f00e0'), array['aviation', 'yachts', 'supercars'], true, 'concierge@requestluxury.com'),
  ('RequestLuxury FX Desk', 'fx-desk',
   'Buying abroad? Fix your exchange rate first',
   'On a seven-figure purchase the exchange rate can move the price by more than the legal fees. Speak to our FX desk about forward contracts and same-day settlement.',
   'Compare my FX rate', '/concierge/fx-transfers',
   pg_temp.u('1667035100694-ff123f76f17d'), array['residences'], true, 'concierge@requestluxury.com'),
  ('RequestLuxury Asset Insurance Desk', 'asset-insurance-desk',
   'Insured from the moment the hammer falls',
   'Agreed-value cover for watches, jewellery, collector cars and art, arranged before your purchase leaves the vault, including transit worldwide.',
   'Arrange specialist cover', '/concierge/asset-insurance',
   pg_temp.u('1637718231776-382e68dc08df'), array['horology', 'jewelry'], true, 'concierge@requestluxury.com')
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, body = excluded.body, cta_label = excluded.cta_label,
  target_url = excluded.target_url, image_url = excluded.image_url, verticals = excluded.verticals,
  is_active = excluded.is_active, contact_email = excluded.contact_email;

-- Summary -------------------------------------------------------------------
select vertical, count(*) as listings, round(avg(quality_score)) as avg_quality
from public.listings
where is_showcase
group by vertical
order by vertical;
