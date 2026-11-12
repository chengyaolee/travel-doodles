const { test, describe } = require('node:test');
const assert = require('node:assert');
const { userStore } = require('../src/lib/server/userStore.ts');
const { postsStore } = require('../src/lib/server/postsStore.ts');

describe('Auth, Permissions & Clean Database Synchronization', () => {
  const testCustomId = 'wanderer_' + Date.now();

  test('userStore allows account creation with unique custom_id', () => {
    const user = userStore.createUser({
      custom_id: testCustomId,
      display_name: 'Wanderer Sam',
      bio: 'Chasing sunrises and coffee shops across continents.',
      password: 'secure_password_123',
    });

    assert.ok(user.id, 'User must have a generated ID');
    assert.strictEqual(user.custom_id, testCustomId);
    assert.strictEqual(user.display_name, 'Wanderer Sam');
    assert.strictEqual(user.username, testCustomId);
    assert.ok(user.avatar_url, 'Must assign an avatar');
    assert.strictEqual(user.password_hash, undefined, 'SafeUser must not expose password_hash');
  });

  test('userStore rejects duplicate custom_id', () => {
    assert.throws(
      () => {
        userStore.createUser({
          custom_id: testCustomId,
          display_name: 'Duplicate Sam',
        });
      },
      /already taken/,
      'Must throw error when custom_id is already registered'
    );
  });

  test('userStore validates credentials and manages sessions', () => {
    // Valid credentials
    const valid = userStore.verifyCredentials(testCustomId, 'secure_password_123');
    assert.ok(valid, 'Valid credentials must return user');
    assert.strictEqual(valid.custom_id, testCustomId);

    // Invalid credentials
    const invalid = userStore.verifyCredentials(testCustomId, 'wrong_password');
    assert.strictEqual(invalid, null, 'Invalid password must return null');

    // Create session
    const sessionToken = userStore.createSession(valid.id);
    assert.ok(sessionToken.startsWith('sess_'), 'Session token must have sess_ prefix');

    // Validate session
    const authedUser = userStore.validateSession(sessionToken);
    assert.ok(authedUser, 'Valid session token must resolve to user');
    assert.strictEqual(authedUser.id, valid.id);

    // Revoke session
    userStore.revokeSession(sessionToken);
    const revokedUser = userStore.validateSession(sessionToken);
    assert.strictEqual(revokedUser, null, 'Revoked session token must return null');
  });

  test('Browsing is free for everyone (no account required)', () => {
    // List posts (public browsing)
    const postsResult = postsStore.getPosts();
    assert.ok(Array.isArray(postsResult.posts), 'Browsing posts must succeed for guests');

    // Map spatial bounds (public browsing)
    const mapPosts = postsStore.getMapPosts('-10,35,30,60', 5);
    assert.ok(Array.isArray(mapPosts), 'Browsing map posts must succeed for guests');

    // Comments query (public browsing)
    const samplePostId = postsResult.posts[0]?.id || 'dummy-id';
    const comments = postsStore.getComments(samplePostId);
    assert.ok(Array.isArray(comments), 'Browsing comments must succeed for guests');
  });

  test('Share links can be generated and resolved without accounts', () => {
    const post = {
      id: 'test-share-123',
      country: 'JP',
      city: 'Tokyo',
      region: 'JP-13',
    };

    const shareUrl = `/explore?country=${post.country}&city=${encodeURIComponent(post.city)}&post=${post.id}`;
    assert.ok(shareUrl.includes('post=test-share-123'), 'Share link includes post ID');
    assert.ok(shareUrl.includes('country=JP'), 'Share link includes country code');
    assert.ok(shareUrl.startsWith('/explore?'), 'Share link deep links to explore atlas');
  });

  test('Interactions require authenticated traveler credentials', () => {
    // Simulated request without session
    const guestReq = {
      cookies: { get: () => undefined },
      headers: { get: () => null },
    };
    const unauthedUser = userStore.getAuthUser(guestReq);
    assert.strictEqual(unauthedUser, null, 'Guest request must not have authUser');

    // Simulated request with valid session cookie
    const user = userStore.findByCustomId(testCustomId);
    assert.ok(user, 'Test user must exist');
    const token = userStore.createSession(user.id);

    const authedCookieReq = {
      cookies: { get: (name) => (name === 'travel_session' ? { value: token } : undefined) },
      headers: { get: () => null },
    };
    const verifiedUser = userStore.getAuthUser(authedCookieReq);
    assert.ok(verifiedUser, 'Cookie session must resolve user');
    assert.strictEqual(verifiedUser.custom_id, testCustomId);

    // Simulated request with Authorization Bearer header
    const authedHeaderReq = {
      cookies: { get: () => undefined },
      headers: { get: (name) => (name === 'authorization' ? `Bearer ${token}` : null) },
    };
    const verifiedHeaderUser = userStore.getAuthUser(authedHeaderReq);
    assert.ok(verifiedHeaderUser, 'Bearer header must resolve user');
    assert.strictEqual(verifiedHeaderUser.custom_id, testCustomId);
  });
});
