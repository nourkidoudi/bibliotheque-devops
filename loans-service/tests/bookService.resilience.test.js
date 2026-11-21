process.env.NODE_ENV = 'test';
process.env.BOOKS_MAX_RETRIES = '2';
process.env.BOOKS_TIMEOUT_MS = '200';

jest.mock('axios', () => {
  const request = jest.fn();
  return { create: () => ({ request }), __request: request };
});

const axios = require('axios');
const bookService = require('../src/services/bookService');

beforeEach(() => axios.__request.mockReset());

test('retry : 2 échecs réseau puis succès', async () => {
  axios.__request
    .mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockResolvedValueOnce({ data: { success: true } });

  const data = await bookService.updateStock('b1', 'decrement', 'reserve-abc12345');
  expect(data.success).toBe(true);
  expect(axios.__request).toHaveBeenCalledTimes(3);
  // le même operationId est renvoyé à chaque tentative => idempotence
  axios.__request.mock.calls.forEach(([cfg]) => expect(cfg.data.operationId).toBe('reserve-abc12345'));
}, 10000);

test('pas de retry sur une erreur métier 409', async () => {
  const err = new Error('conflict');
  err.response = { status: 409 };
  axios.__request.mockRejectedValue(err);

  await expect(bookService.updateStock('b1', 'decrement', 'reserve-xyz12345')).rejects.toThrow();
  expect(axios.__request).toHaveBeenCalledTimes(1);
});

test('getBook retourne null sur 404', async () => {
  const err = new Error('nf');
  err.response = { status: 404 };
  axios.__request.mockRejectedValue(err);
  await expect(bookService.getBook('nope')).resolves.toBeNull();
});

test('action de stock invalide rejetée', async () => {
  await expect(bookService.updateStock('b1', 'change', 'x')).rejects.toThrow(/invalide/);
});
