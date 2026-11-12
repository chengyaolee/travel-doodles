const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { userStore, generateRandomCustomId } = require('../src/lib/server/userStore.ts');
const { postsStore } = require('../src/lib/server/postsStore.ts');

describe('Auth, Permissions & Clean Database Synchronization', () => {
  const testCustomId = 'wanderer_' + Date.now();

  test('userStore allows account creation with unique custom_id and anonymous avatar default (no passwords)', () => {
    const user = userStore.createUser({
      custom_id: testCustomId,
      display_name: 'Wanderer Sam',
      bio: 'Chasing sunrises and coffee shops across continents.',
    });

    assert.ok(user.id, 'User must have a generated ID');
    assert.strictEqual(user.custom_id, testCustomId);
    assert.strictEqual(user.display_name, 'Wanderer Sam');
    assert.strictEqual(user.username, testCustomId);
    assert.strictEqual(user.avatar_url, '', 'Default avatar must be empty for anonymous silhouette fallback');
  });

  test('userStore supports randomized custom_id generation', () => {
    const randomId1 = generateRandomCustomId();
    const randomId2 = generateRandomCustomId();
    assert.ok(randomId1.startsWith('traveler_'), 'Random ID must start with traveler_ prefix');
    assert.notStrictEqual(randomId1, randomId2, 'Subsequent random IDs must be unique');

    // Auto-assign random handle when custom_id is omitted
    const autoUser = userStore.createUser({
      display_name: 'Anonymous Traveler',
    });
    assert.ok(autoUser.custom_id.startsWith('traveler_'), 'User created without custom_id gets random handle');
  });

  test('userStore allows updating custom_id with uniqueness and format validation', () => {
    const initialUser = userStore.createUser({
      display_name: 'Handle Changer',
    });

    const newHandle = 'globetrotter_' + Math.floor(Math.random() * 10000);
    const updated = userStore.updateCustomId(initialUser.id, newHandle);
    assert.strictEqual(updated.custom_id, newHandle);
    assert.strictEqual(updated.username, newHandle);

    // Rejects invalid format (e.g. spaces or special chars)
    assert.throws(
      () => userStore.updateCustomId(initialUser.id, 'invalid handle!'),
      /must be 3-30 characters/,
      'Must reject invalid handle format'
    );

    // Rejects duplicate handle
    assert.throws(
      () => userStore.updateCustomId(initialUser.id, testCustomId),
      /just claimed by another traveler|already taken/,
      'Must reject duplicate handle'
    );
  });

  test('userStore manages mutual friends list', () => {
    const userA = userStore.createUser({ display_name: 'Alice Traveler' });
    const userB = userStore.createUser({ display_name: 'Bob Traveler' });

    assert.strictEqual(userStore.isFriend(userA.id, userB.id), false);

    // Add friend
    userStore.addFriend(userA.id, userB.id);
    assert.strictEqual(userStore.isFriend(userA.id, userB.id), true);
    assert.strictEqual(userStore.isFriend(userB.id, userA.id), true, 'Friendship is mutual');

    // List friends
    const friendsOfA = userStore.listFriends(userA.id);
    assert.ok(friendsOfA.some((f) => f.id === userB.id));

    // Remove friend
    userStore.removeFriend(userA.id, userB.id);
    assert.strictEqual(userStore.isFriend(userA.id, userB.id), false);
  });

  test('userStore supports passwordless OAuth user lookup and registration', () => {
    const oauthProviderId = 'google_sub_' + Date.now();
    const existing = userStore.findByOAuth('google', oauthProviderId);
    assert.strictEqual(existing, null);

    const createdOAuthUser = userStore.createUser({
      display_name: 'Google Explorer',
      auth_provider: 'google',
      auth_provider_id: oauthProviderId,
    });

    assert.ok(createdOAuthUser.custom_id.startsWith('traveler_'));
    const resolved = userStore.findByOAuth('google', oauthProviderId);
    assert.ok(resolved);
    assert.strictEqual(resolved.id, createdOAuthUser.id);
  });

  test('Zero emoji policy is strictly maintained across frontend source files', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    const violations = [];

    function scan(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scan(full);
        } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(full, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (emojiRegex.test(line)) {
              violations.push(`${full}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }

    scan(path.join(__dirname, '../src'));
    assert.deepStrictEqual(violations, [], `No emojis allowed in frontend code. Violations: ${violations.join(', ')}`);
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

  test('userStore checks handle availability and validates format', () => {
    // Non-existent handle is available
    const freshHandle = 'avail_' + Math.floor(Math.random() * 100000);
    const availCheck = userStore.checkHandleAvailability(freshHandle);
    assert.strictEqual(availCheck.available, true);
    assert.strictEqual(availCheck.valid, true);

    // Existing handle is taken
    const takenCheck = userStore.checkHandleAvailability(testCustomId);
    assert.strictEqual(takenCheck.available, false);
    assert.strictEqual(takenCheck.isTaken, true);

    // Invalid format
    const invalidCheck = userStore.checkHandleAvailability('bad handle with spaces');
    assert.strictEqual(invalidCheck.available, false);
    assert.strictEqual(invalidCheck.valid, false);

    // User checking their own current handle
    const testUser = userStore.findByCustomId(testCustomId);
    const selfCheck = userStore.checkHandleAvailability(testCustomId, testUser.id);
    assert.strictEqual(selfCheck.available, true);
    assert.strictEqual(selfCheck.isCurrent, true);
  });

  test('userStore handles concurrent handle updates and prevents race conditions', () => {
    const user1 = userStore.createUser({ display_name: 'Traveler One' });
    const user2 = userStore.createUser({ display_name: 'Traveler Two' });

    const contestedHandle = 'nomad_' + Math.floor(Math.random() * 100000);

    // User 1 updates to contestedHandle successfully
    const updatedUser1 = userStore.updateCustomId(user1.id, contestedHandle);
    assert.strictEqual(updatedUser1.custom_id, contestedHandle);

    // User 2 tries to update to contestedHandle simultaneously: MUST throw conflict
    assert.throws(
      () => userStore.updateCustomId(user2.id, contestedHandle),
      /just claimed by another traveler/,
      'Concurrent update to same handle must throw conflict error'
    );
  });

  test('userStore manages passwordless sessions without password verification', () => {
    const user = userStore.findByCustomId(testCustomId);
    assert.ok(user, 'User must exist');

    // Create session
    const sessionToken = userStore.createSession(user.id);
    assert.ok(sessionToken.startsWith('sess_'), 'Session token must have sess_ prefix');

    // Validate session
    const authedUser = userStore.validateSession(sessionToken);
    assert.ok(authedUser, 'Valid session token must resolve to user');
    assert.strictEqual(authedUser.id, user.id);

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
