jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../src/models/Loan');
jest.mock('../src/models/LoanStats');
jest.mock('../src/services/notificationService', () => ({
  createDueReminder: jest.fn().mockResolvedValue(),
  createOverdueNotice: jest.fn().mockResolvedValue(),
  createFineNotice: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/services/bookService');

const cron = require('node-cron');
const Loan = require('../src/models/Loan');
const notificationService = require('../src/services/notificationService');
const { checkOverdueLoans, sendDueReminders, initCronJobs } = require('../src/services/cronJobs');

beforeEach(() => {
  jest.clearAllMocks();
});

test('sends reminders to loans due within two days', async () => {
  const loan = { _id: 'loan-1' };
  Loan.find.mockResolvedValue([loan]);

  await sendDueReminders();

  expect(notificationService.createDueReminder).toHaveBeenCalledWith(loan);
});

test('applies and notifies the initial overdue fine', async () => {
  const loan = {
    _id: 'loan-1',
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    finePerDay: 0.5,
    save: jest.fn().mockResolvedValue(),
  };
  Loan.find.mockResolvedValueOnce([loan]).mockResolvedValueOnce([]);

  await checkOverdueLoans();

  expect(loan.status).toBe('overdue');
  expect(loan.fine).toBeGreaterThan(0);
  expect(notificationService.createOverdueNotice).toHaveBeenCalledWith(loan);
  expect(notificationService.createFineNotice).toHaveBeenCalledWith(loan, loan.fine);
});

test('notifies when an existing overdue loan first accrues a fine', async () => {
  const loan = {
    _id: 'loan-2',
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    finePerDay: 0.5,
    fine: 0,
    status: 'overdue',
    returnDate: null,
    save: jest.fn().mockResolvedValue(),
  };
  Loan.find.mockResolvedValueOnce([]).mockResolvedValueOnce([loan]);

  await checkOverdueLoans();

  expect(loan.fine).toBeGreaterThan(0);
  expect(notificationService.createFineNotice).toHaveBeenCalledWith(loan, loan.fine);
});

test('schedules daily and weekly jobs in the configured Tunisia timezone', () => {
  process.env.CRON_TIMEZONE = 'Africa/Tunis';
  initCronJobs();

  expect(cron.schedule).toHaveBeenCalledWith(
    '0 8 * * *',
    expect.any(Function),
    { timezone: 'Africa/Tunis' }
  );
  expect(cron.schedule).toHaveBeenCalledWith(
    '0 0 * * 0',
    expect.any(Function),
    { timezone: 'Africa/Tunis' }
  );
  delete process.env.CRON_TIMEZONE;
});
