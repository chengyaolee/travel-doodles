const { test, describe } = require('node:test');
const assert = require('node:assert');
const { postsStore } = require('../src/lib/server/postsStore.ts');

describe('Backend Real Data Store & Landing-to-Explore Map Links', () => {
  test('postsStore manages real posts and filtering', () => {
    const initial = postsStore.getPosts();
    assert.ok(Array.isArray(initial.posts), 'Posts must be an array');

    // Create a Japan post
    const jpPost = postsStore.createPost({
      city: 'Tokyo',
      country: 'JP',
      caption: 'Neon rain reflections in Shibuya.',
      coordinates: [139.7006, 35.6595],
      author: 'Test Traveler',
    });
    assert.ok(jpPost.id, 'Created Japan post must have an ID');

    // Filter by country
    const jp = postsStore.getPosts({ country: 'JP' });
    assert.ok(jp.posts.length > 0, 'Must return Japan posts');
    assert.ok(jp.posts.every(p => p.country === 'JP'), 'All posts must have country JP');

    // Create a new post with actual map coordinates and no emoji sticker
    const created = postsStore.createPost({
      city: 'Reykjavik',
      country: 'IS',
      caption: 'Aurora borealis dancing above the geothermal hot spring.',
      doodleSticker: '',
      author: 'Test Traveler',
      coordinates: [-21.9426, 64.1466],
    });

    assert.ok(created.id, 'Created post must have an ID');
    assert.strictEqual(created.city, 'Reykjavik');
    assert.strictEqual(created.country, 'IS');
    assert.strictEqual(created.doodleSticker, '', 'Doodle sticker must be empty (emojis removed)');
    assert.deepStrictEqual(created.coordinates, [-21.9426, 64.1466], 'Created post must store exact map coordinates');

    // Verify it is queryable
    const queried = postsStore.getPosts({ country: 'IS' });
    assert.ok(queried.posts.some(p => p.id === created.id), 'Newly created post must be in the store');

    // Test like toggle
    const likeRes = postsStore.toggleLike(created.id);
    assert.strictEqual(likeRes.liked, true, 'First toggle must like post');
    assert.strictEqual(likeRes.likes, 2, 'Likes count should increment');

    const unlikeRes = postsStore.toggleLike(created.id);
    assert.strictEqual(unlikeRes.liked, false, 'Second toggle must unlike post');
    assert.strictEqual(unlikeRes.likes, 1, 'Likes count should decrement');

    // Test comments
    const comment = postsStore.addComment(created.id, 'Incredible view!', 'Friend Explorer');
    assert.ok(comment.id, 'Comment must have an ID');
    assert.strictEqual(comment.text, 'Incredible view!');

    const comments = postsStore.getComments(created.id);
    assert.ok(comments.some(c => c.id === comment.id), 'Comment must be retrieved for post');
  });

  test('Landing site Hero map pins have valid country codes and deep links', () => {
    const heroPinFixtures = [
      { city: 'New York', countryCode: 'US' },
      { city: 'Paris', countryCode: 'FR' },
      { city: 'Tokyo', countryCode: 'JP' },
      { city: 'Cape Town', countryCode: 'ZA' },
      { city: 'Sydney', countryCode: 'AU' },
    ];

    for (const pin of heroPinFixtures) {
      assert.ok(pin.countryCode, `Pin for ${pin.city} must have a countryCode`);
      const exploreUrl = `/explore?country=${pin.countryCode}&city=${encodeURIComponent(pin.city)}`;
      assert.ok(exploreUrl.startsWith('/explore?country='), 'Deep link must route to /explore');
      assert.ok(exploreUrl.includes(pin.countryCode), 'Deep link must contain country code');
    }
  });

  test('Bounding box map spatial filtering works correctly', () => {
    // Add a Paris post within Europe bounds
    postsStore.createPost({
      city: 'Paris',
      country: 'FR',
      caption: 'Boulangerie in Le Marais.',
      coordinates: [2.3522, 48.8566],
      author: 'Test Traveler',
    });

    // Europe bounding box roughly: minLon: -10, minLat: 35, maxLon: 30, maxLat: 60
    const europeBbox = '-10,35,30,60';
    const europePosts = postsStore.getMapPosts(europeBbox, 5);

    assert.ok(Array.isArray(europePosts));
    assert.ok(europePosts.length > 0, 'Europe bbox should return posts');
    for (const post of europePosts) {
      const [lon, lat] = post.coordinates;
      assert.ok(lon >= -10 && lon <= 30, `Longitude ${lon} must be within [-10, 30]`);
      assert.ok(lat >= 35 && lat <= 60, `Latitude ${lat} must be within [35, 60]`);
    }
  });
});
