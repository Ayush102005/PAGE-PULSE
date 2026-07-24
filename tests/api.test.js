/**
 * api.test.js
 * Integration tests for the Express API endpoints.
 * Uses supertest to spin up the app in-process — no real network calls.
 */

const request = require('supertest');
const app = require('../server');

describe('GET /api/health', () => {

  test('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

});

describe('POST /api/audit — input validation', () => {

  test('returns 400 when the request body is empty', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('returns 400 when the URL is a random invalid string', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'this is not a url!!! @@@@' })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('returns 400 for a localhost SSRF attempt', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://localhost:9999/internal' })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/private or loopback/i);
  });

  test('returns 400 for a private IP SSRF attempt', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://192.168.1.1/admin' })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/private or loopback/i);
  });

});

describe('GET /api/audit — query param variant', () => {

  test('returns 400 when no url query param is provided', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('returns 400 when url query param is invalid', async () => {
    const res = await request(app).get('/api/audit?url=not-valid-@@@@');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('returns 400 for SSRF attempt via query param', async () => {
    const res = await request(app).get('/api/audit?url=http://10.0.0.1/secret');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/private or loopback/i);
  });

});
