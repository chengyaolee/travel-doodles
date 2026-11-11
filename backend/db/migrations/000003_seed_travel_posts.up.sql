-- Seed initial real traveler account and travel posts in PostgreSQL
INSERT INTO users (id, username, custom_id, display_name, bio, auth_provider, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'travel_explorer',
    'wanderer_guide',
    'Global Explorer',
    'Documenting memories across the world map one doodle at a time.',
    'passwordless_device',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Seed real geographical posts with PostGIS WGS84 geography points
INSERT INTO posts (
    id, author_id, caption, latitude, longitude, location,
    location_name, country_code, visibility, visited_at, created_at, updated_at
)
VALUES 
(
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Midnight umbrellas reflecting neon billboards during a soft spring drizzle. The pulse of Shibuya never slows.',
    35.6595,
    139.7006,
    ST_SetSRID(ST_MakePoint(139.7006, 35.6595), 4326)::geography,
    'Shibuya Crossing, Tokyo',
    'JP',
    'public',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
),
(
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Morning sunlight filtering through towering green bamboo stalks. Wind chimes whispering in the breeze.',
    35.0167,
    135.6713,
    ST_SetSRID(ST_MakePoint(135.6713, 35.0167), 4326)::geography,
    'Arashiyama Bamboo Grove, Kyoto',
    'JP',
    'public',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
),
(
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Golden hour along the Seine. Watching wooden boats drift beneath Pont Neuf with warm baguettes.',
    48.8566,
    2.3522,
    ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::geography,
    'Pont Neuf, Paris',
    'FR',
    'public',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
),
(
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    'Dusk settling over Manhattan from the Brooklyn Bridge promenade. Crisp harbor breeze and amber streetlamps.',
    40.7061,
    -73.9969,
    ST_SetSRID(ST_MakePoint(-73.9969, 40.7061), 4326)::geography,
    'Brooklyn Bridge, New York',
    'US',
    'public',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),
(
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000001',
    'Lush emerald rice terraces catching the early tropical dawn. Palms rustling in the mountain fog.',
    -8.4333,
    115.2833,
    ST_SetSRID(ST_MakePoint(115.2833, -8.4333), 4326)::geography,
    'Tegalalang Rice Terraces, Bali',
    'ID',
    'public',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '00000000-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000001',
    'Crystal turquoise lagoon along the 180th meridian. Warm coral reef teeming with tropical fish.',
    -16.7833,
    179.9833,
    ST_SetSRID(ST_MakePoint(179.9833, -16.7833), 4326)::geography,
    'Taveuni Island, Fiji',
    'FJ',
    'public',
    NOW() - INTERVAL '1 days',
    NOW() - INTERVAL '1 days',
    NOW() - INTERVAL '1 days'
)
ON CONFLICT (id) DO NOTHING;

-- Attach media images
INSERT INTO post_media (id, post_id, object_key, width, height, sort_order, created_at)
VALUES
(
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
),
(
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000011',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
),
(
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000012',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
),
(
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000013',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
),
(
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000014',
    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
),
(
    '00000000-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000015',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=420&fit=crop',
    600, 420, 0, NOW()
)
ON CONFLICT (id) DO NOTHING;
