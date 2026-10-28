import http from 'node:http';
import { createApp } from '../src/app.js';

async function runHttpTests() {
  console.log('🌐 Starting End-to-End HTTP Route Tests...\n');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

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
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'GET /health returns 200');
    assert(healthData.data.status === 'healthy', 'Health status is healthy');

    // 2. Register validation failure (password too short)
    const badRegisterRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad@test.com', password: '123', name: 'Bad' }),
    });
    const badRegisterData = await badRegisterRes.json();
    assert(badRegisterRes.status === 400, 'POST /auth/register invalid password rejected with 400');
    assert(badRegisterData.success === false, 'Validation error success is false');

    // 3. Register valid user
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@crypto.org',
        password: 'Password123!',
        name: 'Alice Springs',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'POST /auth/register valid user returns 201');
    assert(!!regData.data.tokens.accessToken, 'Register returns access token');
    const { accessToken, refreshToken } = regData.data.tokens;

    // 4. Protected route GET /auth/me with Bearer token
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /auth/me with valid Bearer token returns 200');
    assert(meData.data.email === 'alice@crypto.org', 'Profile email matches');

    // 5. GET /auth/me without token -> 401
    const noAuthRes = await fetch(`${baseUrl}/auth/me`);
    assert(noAuthRes.status === 401, 'GET /auth/me without header returns 401');

    // 6. POST /auth/refresh
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, 'POST /auth/refresh returns 200');
    assert(refreshData.data.refreshToken !== refreshToken, 'Rotated new refresh token');
    const newAccessToken = refreshData.data.accessToken;

    // 7. POST /auth/logout
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newAccessToken}`,
      },
    });
    assert(logoutRes.status === 200, 'POST /auth/logout returns 200');

    // 8. Login with seed demo user (alex@example.com)
    const demoRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.com', password: 'Password123!' }),
    });
    const demoData = await demoRes.json();
    assert(demoRes.status === 200, 'POST /auth/login with demo user returns 200');
    assert(demoData.data.user.email === 'alex@example.com', 'Demo user email is alex@example.com');

    console.log(`\n========================================`);
    console.log(`HTTP Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
  } finally {
    server.close();
  }
}

runHttpTests();
