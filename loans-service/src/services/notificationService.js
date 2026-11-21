const Notification = require('../models/Notification');
const { format } = require('date-fns');
const usersService = require('./usersService');

const formatAmount = (amount) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const createNotification = async ({ userId, type, title, message, loanId, dedupeKey }) =>
  Notification.findOneAndUpdate(
    { dedupeKey },
    {
      $setOnInsert: {
        userId,
        type,
        title,
        message,
        relatedLoanId: loanId,
        dedupeKey,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const notifyLoanAudience = async ({ loan, type, title, message, dedupeKey }) => {
  const borrowerNotification = await createNotification({
    userId: loan.userId,
    type,
    title,
    message,
    loanId: loan._id,
    dedupeKey: `${dedupeKey}:${loan.userId}`,
  });

  try {
    const staff = await usersService.getStaffRecipients();
    const staffRecipients = staff.filter((recipient) => recipient.id !== loan.userId);
    await Promise.all(
      staffRecipients.map((recipient) =>
        createNotification({
          userId: recipient.id,
          type,
          title,
          message,
          loanId: loan._id,
          dedupeKey: `${dedupeKey}:${recipient.id}`,
        })
      )
    );
  } catch (error) {
    console.error(`[Notification] Failed to notify library staff: ${error.message}`);
  }

  return borrowerNotification;
};

const createBorrowConfirmation = async (loan) => {
  try {
    const dueFormatted = format(new Date(loan.dueDate), 'dd/MM/yyyy');
    return await notifyLoanAudience({
      loan,
      type: 'borrow_confirmation',
      title: 'Emprunt confirmé',
      message: `Vous avez emprunté « ${loan.bookTitle} ». La date de retour est le ${dueFormatted}.`,
      dedupeKey: `borrow:${loan._id}`,
    });
  } catch (error) {
    console.error(`[Notification] Failed to create borrow confirmation: ${error.message}`);
    throw error;
  }
};

/**
 * Create a due date reminder notification for a loan.
 * @param {object} loan - The loan document
 */
const createDueReminder = async (loan) => {
  try {
    const dueFormatted = format(new Date(loan.dueDate), 'dd/MM/yyyy');
    const notification = await notifyLoanAudience({
      loan,
      type: 'due_reminder',
      title: 'Rappel de retour',
      message: `L’emprunt de « ${loan.bookTitle} » arrive à échéance le ${dueFormatted}. Pensez à le retourner à temps pour éviter une pénalité.`,
      dedupeKey: `due-reminder:${loan._id}:${new Date(loan.dueDate).toISOString()}`,
    });
    console.log(`[Notification] Due reminder created for user ${loan.userId} - Loan ${loan._id}`);
    return notification;
  } catch (error) {
    console.error(`[Notification] Failed to create due reminder: ${error.message}`);
    throw error;
  }
};

/**
 * Create an overdue notice notification for a loan.
 * @param {object} loan - The loan document
 */
const createOverdueNotice = async (loan) => {
  try {
    const dueFormatted = format(new Date(loan.dueDate), 'dd/MM/yyyy');
    const daysLate = Math.floor((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
    const accumulatedFine = formatAmount(daysLate * loan.finePerDay);

    const notification = await notifyLoanAudience({
      loan,
      type: 'overdue',
      title: 'Retard de retour',
      message: `L’emprunt de « ${loan.bookTitle} » devait être rendu le ${dueFormatted}. Il a ${daysLate} jour(s) de retard. Pénalité actuelle : ${accumulatedFine} DT. Merci de le rapporter dès que possible.`,
      dedupeKey: `overdue:${loan._id}`,
    });
    console.log(`[Notification] Overdue notice created for user ${loan.userId} - Loan ${loan._id}`);
    return notification;
  } catch (error) {
    console.error(`[Notification] Failed to create overdue notice: ${error.message}`);
    throw error;
  }
};

/**
 * Create a return confirmation notification for a loan.
 * @param {object} loan - The loan document
 */
const createReturnConfirmation = async (loan) => {
  try {
    const returnFormatted = format(new Date(loan.returnDate || new Date()), 'dd/MM/yyyy');
    let message = `Vous avez rendu « ${loan.bookTitle} » le ${returnFormatted}.`;

    if (loan.fine > 0) {
      message += ` Une pénalité de ${formatAmount(loan.fine)} DT a été appliquée pour le retard.`;
    }

    const notification = await notifyLoanAudience({
      loan,
      type: 'return_confirmation',
      title: 'Retour confirmé',
      message,
      dedupeKey: `return:${loan._id}`,
    });
    console.log(`[Notification] Return confirmation created for user ${loan.userId} - Loan ${loan._id}`);
    return notification;
  } catch (error) {
    console.error(`[Notification] Failed to create return confirmation: ${error.message}`);
    throw error;
  }
};

/**
 * Create a fine notice notification for a loan.
 * @param {object} loan - The loan document
 * @param {number} amount - Fine amount in dinars
 */
const createFineNotice = async (loan, amount) => {
  try {
    const notification = await notifyLoanAudience({
      loan,
      type: 'fine_notice',
      title: 'Pénalité appliquée',
      message: `Une pénalité de ${formatAmount(amount)} DT a été appliquée à l’emprunt de « ${loan.bookTitle} ». Veuillez la régler à la bibliothèque.`,
      dedupeKey: `fine:${loan._id}:${amount.toFixed(2)}`,
    });
    console.log(`[Notification] Fine notice created for user ${loan.userId} - Loan ${loan._id}, amount: ${amount}`);
    return notification;
  } catch (error) {
    console.error(`[Notification] Failed to create fine notice: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createBorrowConfirmation,
  createDueReminder,
  createOverdueNotice,
  createReturnConfirmation,
  createFineNotice,
};
