process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// ── Mocks : aucune base de données ni service externe n'est nécessaire ──
jest.mock('../src/models/Loan');
jest.mock('../src/services/bookService');
jest.mock('../src/services/notificationService', () => ({
  createBorrowConfirmation: jest.fn().mockResolvedValue(),
  createReturnConfirmation: jest.fn().mockResolvedValue(),
  createFineNotice: jest.fn().mockResolvedValue(),
  createOverdueNotice: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/models/LoanStats', () => ({}));
jest.mock('../src/models/Notification', () => ({}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const Loan = require('../src/models/Loan');
const bookService = require('../src/services/bookService');
const notificationService = require('../src/services/notificationService');
const app = require('../src/app');

const token = jwt.sign(
  { id: 'user-1', email: 'student@university.com', role: 'student', firstName: 'Sara', lastName: 'B' },
  'test-secret'
);
const auth = { Authorization: `Bearer ${token}` };
const BOOK = { id: 'b1', title: 'Clean Architecture', author: 'R. Martin', isbn: '123', availableCopies: 3 };

const makeLoan = (extra = {}) => {
  const loan = { _id: 'loan-1', ...extra, save: jest.fn().mockResolvedValue() };
  return loan;
};

beforeEach(() => {
  jest.clearAllMocks();
  Loan.countDocuments.mockResolvedValue(0);
  Loan.find.mockResolvedValue([]);
  Loan.findOne.mockResolvedValue(null);
  bookService.getBook.mockResolvedValue({ data: BOOK });
});

describe('POST /api/loans/borrow (Saga)', () => {
  test('succès : emprunt créé en pending puis passé en active', async () => {
    const loan = makeLoan({ status: 'pending' });
    Loan.create.mockResolvedValue(loan);
    bookService.updateStock.mockResolvedValue({});

    const res = await request(app).post('/api/loans/borrow').set(auth).send({ bookId: 'b1' });

    expect(res.status).toBe(201);
    expect(Loan.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(bookService.updateStock).toHaveBeenCalledWith('b1', 'decrement', expect.stringMatching(/^reserve-/));
    expect(loan.status).toBe('active');
    expect(loan.save).toHaveBeenCalled();
  });

  test('compensation : stock épuisé (409) => emprunt "failed", pas de re-synchronisation', async () => {
    const loan = makeLoan({ status: 'pending' });
    Loan.create.mockResolvedValue(loan);
    const err = new Error('conflict');
    err.response = { status: 409 };
    bookService.updateStock.mockRejectedValue(err);

    const res = await request(app).post('/api/loans/borrow').set(auth).send({ bookId: 'b1' });

    expect(res.status).toBe(409);
    expect(loan.status).toBe('failed');
    expect(loan.stockSyncPending).toBe(false);
  });

  test('compensation : books-service en panne => emprunt "failed" + réconciliation planifiée', async () => {
    const loan = makeLoan({ status: 'pending' });
    Loan.create.mockResolvedValue(loan);
    bookService.updateStock.mockRejectedValue(new Error('timeout'));

    const res = await request(app).post('/api/loans/borrow').set(auth).send({ bookId: 'b1' });

    expect(res.status).toBe(503);
    expect(loan.status).toBe('failed');
    expect(loan.stockSyncPending).toBe(true);
    expect(loan.releaseOpId).toMatch(/^release-/);
  });

  test('refuse au-delà de 5 emprunts actifs', async () => {
    Loan.countDocuments.mockResolvedValue(5);
    const res = await request(app).post('/api/loans/borrow').set(auth).send({ bookId: 'b1' });
    expect(res.status).toBe(400);
    expect(Loan.create).not.toHaveBeenCalled();
  });

  test('refuse si amendes impayées > 10 DT', async () => {
    Loan.find.mockResolvedValue([{ fine: 12 }]);
    const res = await request(app).post('/api/loans/borrow').set(auth).send({ bookId: 'b1' });
    expect(res.status).toBe(403);
  });

  test('401 sans token', async () => {
    const res = await request(app).post('/api/loans/borrow').send({ bookId: 'b1' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/loans/:id/return', () => {
  test('retour : le stock est rendu avec un operationId idempotent', async () => {
    const loan = makeLoan({
      status: 'active', userId: 'user-1', bookId: 'b1', dueDate: new Date(Date.now() + 86400000),
    });
    Loan.findById.mockResolvedValue(loan);
    bookService.updateStock.mockResolvedValue({});

    const res = await request(app).put('/api/loans/loan-1/return').set(auth);

    expect(res.status).toBe(200);
    expect(bookService.updateStock).toHaveBeenCalledWith('b1', 'increment', expect.stringMatching(/^release-/));
    expect(loan.stockSyncPending).toBe(false);
  });

  test('retour : books-service KO => retour enregistré, stock à réconcilier', async () => {
    const loan = makeLoan({
      status: 'active', userId: 'user-1', bookId: 'b1', dueDate: new Date(Date.now() + 86400000),
    });
    Loan.findById.mockResolvedValue(loan);
    bookService.updateStock.mockRejectedValue(new Error('down'));

    const res = await request(app).put('/api/loans/loan-1/return').set(auth);

    expect(res.status).toBe(200);
    expect(loan.status).toBe('returned');
    expect(loan.stockSyncPending).toBe(true);
  });

  test('retour en retard : crée un avis de pénalité', async () => {
    const loan = makeLoan({
      status: 'active',
      userId: 'user-1',
      bookId: 'b1',
      dueDate: new Date(Date.now() - 2 * 86400000),
      finePerDay: 0.5,
      fine: 0,
    });
    Loan.findById.mockResolvedValue(loan);
    bookService.updateStock.mockResolvedValue({});

    const res = await request(app).put('/api/loans/loan-1/return').set(auth);

    expect(res.status).toBe(200);
    expect(loan.fine).toBeGreaterThan(0);
    expect(notificationService.createFineNotice).toHaveBeenCalledWith(loan, loan.fine);
  });
});

describe('GET /health', () => {
  test('répond 200 et indique l\'état du circuit', async () => {
    bookService.getBreakerState.mockReturnValue({ open: false });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.booksCircuit).toBe('closed');
  });
});
