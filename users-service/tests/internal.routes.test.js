process.env.NODE_ENV = 'test';
process.env.SERVICE_API_KEY = 'test-service-key';

jest.mock('../src/models', () => ({
  User: { findAll: jest.fn() },
}));

const request = require('supertest');
const { User } = require('../src/models');
const app = require('../src/app');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/internal/staff', () => {
  test('rejects requests without the service key', async () => {
    const response = await request(app).get('/api/internal/staff');

    expect(response.status).toBe(403);
    expect(User.findAll).not.toHaveBeenCalled();
  });

  test('returns only active staff identifiers and roles to the loans service', async () => {
    User.findAll.mockResolvedValue([{ id: 'staff-1', role: 'librarian' }]);

    const response = await request(app)
      .get('/api/internal/staff')
      .set('x-service-api-key', 'test-service-key');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'staff-1', role: 'librarian' }]);
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
        attributes: ['id', 'role'],
        raw: true,
      })
    );
  });
});
