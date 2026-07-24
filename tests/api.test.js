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

});
