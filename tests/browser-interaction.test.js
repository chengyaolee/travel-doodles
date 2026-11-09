const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getPostsByLocation, MOCK_POSTS } = require('../src/lib/explore/mockPosts.ts');

describe('Explore Experience & Regional Feed Interactions', () => {
  test('Post filtering by audience: Explore (everyone) vs Friends', () => {
    const everyonePosts = getPostsByLocation(undefined, undefined, 'everyone');
    const friendsPosts = getPostsByLocation(undefined, undefined, 'friends');

    assert.ok(everyonePosts.length > 0, 'Everyone posts should be present');
    assert.ok(friendsPosts.length > 0, 'Friends posts should be present');
    assert.ok(
      friendsPosts.every(p => p.visibility === 'friends'),
      'All friends posts must have visibility: friends'
    );
  });

  test('Geographic hierarchy navigation: World -> Country -> Region -> Post', () => {
    // 1. World scale
    const worldPosts = getPostsByLocation();
    assert.ok(worldPosts.length > 5, 'World view has aggregate posts');

    // 2. Country scale: Japan (JP)
    const jpPosts = getPostsByLocation('JP');
    assert.ok(jpPosts.length >= 3, 'Japan has multiple posts');
    assert.ok(jpPosts.every(p => p.country === 'JP'), 'All posts belong to Japan');

    // 3. Region scale: Kyoto (JP-26)
    const kyotoPosts = getPostsByLocation('JP', 'JP-26');
    assert.ok(kyotoPosts.length >= 2, 'Kyoto has posts');
    assert.ok(kyotoPosts.every(p => p.region === 'JP-26'), 'All posts belong to Kyoto');

    // 4. Post scale
    const post = MOCK_POSTS.find(p => p.id === 'post-jp-4');
    assert.ok(post, 'Target Kyoto post exists');
    assert.strictEqual(post.country, 'JP');
    assert.strictEqual(post.region, 'JP-26');
    assert.strictEqual(post.city, 'Kyoto');
  });

  test('Outlying territories and antimeridian handling', () => {
    // US Outlying parts (Hawaii, Alaska)
    const hiPosts = getPostsByLocation('US', 'US-HI');
    assert.ok(Array.isArray(hiPosts));

    // Fiji (Antimeridian Crossing 180° meridian)
    const fjPosts = getPostsByLocation('FJ');
    assert.ok(fjPosts.length >= 1, 'Fiji post must exist');
    const fijiPost = fjPosts[0];
    assert.ok(fijiPost.coordinates[0] > 170 || fijiPost.coordinates[0] < -170);
  });

  test('Microstate point target handling (Vatican City & Singapore)', () => {
    const vaPosts = getPostsByLocation('VA');
    assert.ok(vaPosts.length >= 1, 'Vatican City post must exist');
    assert.strictEqual(vaPosts[0].country, 'VA');

    const sgPosts = getPostsByLocation('SG');
    assert.ok(sgPosts.length >= 1, 'Singapore post must exist');
    assert.strictEqual(sgPosts[0].country, 'SG');
  });

  test('Empty state & retry handling for unpinned regions', () => {
    // Non-existent or empty region
    const emptyPosts = getPostsByLocation('IS', 'NON_EXISTENT_REGION');
    assert.strictEqual(emptyPosts.length, 0, 'Empty region returns 0 posts to trigger empty state UI');
  });

  test('Text-only post support', () => {
    const textOnlyPost = MOCK_POSTS.find(p => p.isTextOnly);
    assert.ok(textOnlyPost, 'At least one test fixture must be text-only');
    assert.strictEqual(textOnlyPost.isTextOnly, true);
    assert.ok(textOnlyPost.caption.length > 10, 'Text post must have valid caption');
  });

  test('Deep link query generation', () => {
    const samplePost = MOCK_POSTS[0];
    const params = new URLSearchParams();
    params.set('country', samplePost.country);
    params.set('region', samplePost.region);
    params.set('post', samplePost.id);

    const deepLink = `/explore?${params.toString()}`;
    assert.ok(deepLink.includes(`country=${samplePost.country}`));
    assert.ok(deepLink.includes(`region=${samplePost.region}`));
    assert.ok(deepLink.includes(`post=${samplePost.id}`));
  });
});
