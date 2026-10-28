import { authService } from '../src/services/auth.service.js';
import { userModel } from '../src/models/user.model.js';
import { verifyAccessToken } from '../src/utils/jwt.js';

async function runAuthTests() {
  console.log('🧪 Starting Auth Flow Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Seed demo user login
    console.log('1. Testing Seed Demo User Login (alex@example.com)...');
    const demoLogin = await authService.login({
      email: 'alex@example.com',
      password: 'Password123!',
    });
    assert(!!demoLogin.tokens.accessToken, 'Demo user received access token');
    assert(!!demoLogin.tokens.refreshToken, 'Demo user received refresh token');
    assert(demoLogin.user.email === 'alex@example.com', 'Demo user email matches');
    assert(!('passwordHash' in demoLogin.user), 'Demo user passwordHash is stripped');

    // 2. Register a new user
    console.log('\n2. Testing User Registration...');
    const registerResult = await authService.register({
      email: 'sarah@example.com',
      password: 'StrongPassword123!',
      name: 'Sarah Connor',
      role: 'user',
    });
    assert(registerResult.user.email === 'sarah@example.com', 'Registered user email matches');
    assert(registerResult.user.name === 'Sarah Connor', 'Registered user name matches');
    assert(!!registerResult.tokens.accessToken, 'Received access token upon registration');
    assert(!('passwordHash' in registerResult.user), 'passwordHash stripped from registered user');

    // 3. Prevent duplicate registration
    console.log('\n3. Testing Duplicate Registration Prevention...');
    try {
      await authService.register({
        email: 'sarah@example.com',
        password: 'AnotherPassword1!',
        name: 'Duplicate Sarah',
        role: 'user',
      });
      assert(false, 'Should throw on duplicate email');
    } catch (err: any) {
      assert(err.statusCode === 409, 'Returns 409 Conflict for duplicate email');
    }

    // 4. Login with newly registered user
    console.log('\n4. Testing Login With Registered User...');
    const sarahLogin = await authService.login({
      email: 'sarah@example.com',
      password: 'StrongPassword123!',
    });
    assert(sarahLogin.user.id === registerResult.user.id, 'User ID matches registered ID');
    assert(!!sarahLogin.tokens.accessToken, 'Access token generated');

    // 5. Wrong password rejected
    console.log('\n5. Testing Wrong Password Rejection...');
    try {
      await authService.login({
        email: 'sarah@example.com',
        password: 'WrongPassword!',
      });
      assert(false, 'Should reject invalid password');
    } catch (err: any) {
      assert(err.statusCode === 401, 'Returns 401 for wrong password');
    }

    // 6. Verify Access Token
    console.log('\n6. Testing Access Token Verification...');
    const decodedAccess = verifyAccessToken(sarahLogin.tokens.accessToken);
    assert(decodedAccess.userId === sarahLogin.user.id, 'Decoded token userId matches');
    assert(decodedAccess.email === 'sarah@example.com', 'Decoded token email matches');

    // 7. Token Refresh & Rotation
    console.log('\n7. Testing Token Refresh & Rotation...');
    const oldRefreshToken = sarahLogin.tokens.refreshToken;
    const newTokens = await authService.refreshTokens(oldRefreshToken);
    assert(!!newTokens.accessToken, 'New access token generated on refresh');
    assert(!!newTokens.refreshToken, 'New refresh token generated on refresh');
    assert(newTokens.refreshToken !== oldRefreshToken, 'Refresh token rotated to new value');

    // 8. Re-using old rotated refresh token is denied
    console.log('\n8. Testing Old Refresh Token Revocation (Rotation Invariant)...');
    try {
      await authService.refreshTokens(oldRefreshToken);
      assert(false, 'Old refresh token should be rejected');
    } catch (err: any) {
      assert(err.statusCode === 401, 'Old refresh token rejected with 401');
    }

    // 9. Fetch Current User Profile
    console.log('\n9. Testing Get Current User Profile...');
    const me = await authService.getCurrentUser(sarahLogin.user.id);
    assert(me.id === sarahLogin.user.id, 'Retrieved user matches');
    assert(!('passwordHash' in me), 'Profile does not contain passwordHash');

    // 10. Logout & Token Invalidation
    console.log('\n10. Testing Logout...');
    await authService.logout(sarahLogin.user.id);
    const userAfterLogout = await userModel.findById(sarahLogin.user.id);
    assert(userAfterLogout?.refreshToken === null, 'User refresh token set to null in store');

    try {
      await authService.refreshTokens(newTokens.refreshToken);
      assert(false, 'Logged-out user refresh token should be rejected');
    } catch (err: any) {
      assert(err.statusCode === 401, 'Logged out refresh token rejected with 401');
    }

    console.log(`\n========================================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Unexpected test runner error:', error);
    process.exit(1);
  }
}

runAuthTests();
