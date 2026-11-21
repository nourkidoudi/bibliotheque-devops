jest.mock('../src/models/Notification', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'notification-1' }),
}));
jest.mock('../src/services/usersService', () => ({
  getStaffRecipients: jest.fn().mockResolvedValue([
    { id: 'librarian-1', role: 'librarian' },
    { id: 'admin-1', role: 'admin' },
  ]),
}));

const Notification = require('../src/models/Notification');
const usersService = require('../src/services/usersService');
const notificationService = require('../src/services/notificationService');

const loan = {
  _id: 'loan-1',
  userId: 'student-1',
  bookTitle: 'Le Petit Prince',
  dueDate: new Date('2026-12-01T10:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  Notification.findOneAndUpdate.mockResolvedValue({ _id: 'notification-1' });
  usersService.getStaffRecipients.mockResolvedValue([
    { id: 'librarian-1', role: 'librarian' },
    { id: 'admin-1', role: 'admin' },
  ]);
});

describe('loan notifications', () => {
  test('sends a French, deduplicated notification to the borrower and every active staff recipient', async () => {
    await notificationService.createBorrowConfirmation(loan);

    expect(Notification.findOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { dedupeKey: 'borrow:loan-1:student-1' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          userId: 'student-1',
          title: 'Emprunt confirmé',
          message: expect.stringContaining('Le Petit Prince'),
        }),
      }),
      expect.any(Object)
    );
    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { dedupeKey: 'borrow:loan-1:librarian-1' },
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('uses the due date in the reminder key to permit a new reminder after renewal', async () => {
    await notificationService.createDueReminder(loan);

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { dedupeKey: `due-reminder:loan-1:${loan.dueDate.toISOString()}:student-1` },
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('keeps the borrower notification if the users service is temporarily unavailable', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    usersService.getStaffRecipients.mockRejectedValue(new Error('users service unavailable'));

    await expect(notificationService.createBorrowConfirmation(loan)).resolves.toBeDefined();
    expect(Notification.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      '[Notification] Failed to notify library staff: users service unavailable'
    );
    consoleError.mockRestore();
  });
});
