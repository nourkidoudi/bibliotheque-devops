const cron = require('node-cron');
const { startOfDay, subDays, addDays, startOfWeek, endOfWeek } = require('date-fns');
const Loan = require('../models/Loan');
const LoanStats = require('../models/LoanStats');
const notificationService = require('./notificationService');
const bookService = require('./bookService');

/**
 * Check for overdue loans, update their status, calculate fines, and send notifications.
 * Runs every day at 8:00 AM.
 */
const checkOverdueLoans = async () => {
  console.log('[CronJob] Running overdue loans check...');
  try {
    const now = new Date();

    // Find all active loans that are past their due date
    const overdueLoans = await Loan.find({
      status: 'active',
      dueDate: { $lt: now },
    });

    console.log(`[CronJob] Found ${overdueLoans.length} overdue loan(s)`);

    for (const loan of overdueLoans) {
      // Calculate the fine
      const daysOverdue = Math.floor((now - loan.dueDate) / (1000 * 60 * 60 * 24));
      const calculatedFine = daysOverdue * loan.finePerDay;

      // Update loan status and fine
      loan.status = 'overdue';
      loan.fine = calculatedFine;
      await loan.save();

      // Send overdue notification
      await notificationService.createOverdueNotice(loan);
      if (calculatedFine > 0) {
        await notificationService.createFineNotice(loan, calculatedFine);
      }

      console.log(
        `[CronJob] Loan ${loan._id} marked as overdue. Days: ${daysOverdue}, Fine: ${calculatedFine} DT`
      );
    }

    // Also update fines for already overdue loans
    const existingOverdue = await Loan.find({
      status: 'overdue',
      returnDate: null,
    });

    for (const loan of existingOverdue) {
      const daysOverdue = Math.floor((now - loan.dueDate) / (1000 * 60 * 60 * 24));
      const calculatedFine = daysOverdue * loan.finePerDay;

      if (calculatedFine !== loan.fine) {
        const previousFine = loan.fine || 0;
        loan.fine = calculatedFine;
        await loan.save();
        console.log(`[CronJob] Updated fine for loan ${loan._id}: ${calculatedFine} DT`);
        if (previousFine === 0 && calculatedFine > 0) {
          await notificationService.createFineNotice(loan, calculatedFine);
        }
      }
    }

    console.log('[CronJob] Overdue loans check completed');
  } catch (error) {
    console.error('[CronJob] Error checking overdue loans:', error.message);
  }
};

/**
 * Send due date reminders for books due within the next 2 days.
 * Runs every day at 8:00 AM.
 */
const sendDueReminders = async () => {
  console.log('[CronJob] Running due date reminders...');
  try {
    const now = new Date();
    const twoDaysFromNow = addDays(now, 2);

    // Find active loans due within the next 2 days
    const loansDueSoon = await Loan.find({
      status: 'active',
      dueDate: {
        $gte: startOfDay(now),
        $lte: twoDaysFromNow,
      },
    });

    console.log(`[CronJob] Found ${loansDueSoon.length} loan(s) due within 2 days`);

    for (const loan of loansDueSoon) {
      await notificationService.createDueReminder(loan);
    }

    console.log('[CronJob] Due date reminders completed');
  } catch (error) {
    console.error('[CronJob] Error sending due reminders:', error.message);
  }
};

/**
 * Generate weekly statistics and store in LoanStats collection.
 * Runs every Sunday at midnight.
 */
const generateWeeklyStats = async () => {
  console.log('[CronJob] Generating weekly statistics...');
  try {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Count loans created this week
    const totalLoans = await Loan.countDocuments({
      borrowDate: { $gte: weekStart, $lte: weekEnd },
    });

    // Count returns this week
    const totalReturns = await Loan.countDocuments({
      returnDate: { $gte: weekStart, $lte: weekEnd },
      status: 'returned',
    });

    // Count currently overdue
    const totalOverdue = await Loan.countDocuments({
      status: 'overdue',
    });

    // Sum fines for loans this week
    const finesResult = await Loan.aggregate([
      {
        $match: {
          updatedAt: { $gte: weekStart, $lte: weekEnd },
          fine: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalFines: { $sum: '$fine' },
        },
      },
    ]);
    const totalFines = finesResult.length > 0 ? finesResult[0].totalFines : 0;

    // Top borrowed books this week
    const topBooksResult = await Loan.aggregate([
      {
        $match: {
          borrowDate: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $group: {
          _id: '$bookId',
          bookTitle: { $first: '$bookTitle' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          bookId: '$_id',
          bookTitle: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Upsert the weekly stats document
    await LoanStats.findOneAndUpdate(
      { date: startOfDay(weekStart) },
      {
        date: startOfDay(weekStart),
        totalLoans,
        totalReturns,
        totalOverdue,
        totalFines,
        topBooks: topBooksResult,
      },
      { upsert: true, new: true }
    );

    console.log(
      `[CronJob] Weekly stats generated: Loans=${totalLoans}, Returns=${totalReturns}, Overdue=${totalOverdue}, Fines=${totalFines}`
    );
  } catch (error) {
    console.error('[CronJob] Error generating weekly stats:', error.message);
  }
};

/**
 * Initialize all cron jobs.
 */

/**
 * Réconciliation de la Saga : rejoue (de façon idempotente) les libérations
 * de stock qui ont échoué, et compense les emprunts restés "pending".
 * Tourne toutes les 2 minutes.
 */
const reconcileStock = async () => {
  try {
    // 1) Emprunts "pending" abandonnés (crash entre l'étape 1 et 3) depuis > 2 min
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
    const stale = await Loan.find({ status: 'pending', createdAt: { $lt: staleBefore } });
    for (const loan of stale) {
      loan.status = 'failed';
      loan.failureReason = 'Saga interrompue (pending expiré)';
      loan.stockSyncPending = true; // on ignore si la réservation a été appliquée
      loan.releaseOpId = loan.releaseOpId || `release-${loan._id}`;
      await loan.save();
    }

    // 2) Libérations de stock en attente
    const pendingSync = await Loan.find({
      stockSyncPending: true,
      status: { $in: ['returned', 'failed'] },
    }).limit(50);

    for (const loan of pendingSync) {
      try {
        // Pour un emprunt "failed", on ne rend le stock que si la réservation a bien eu lieu.
        // L'opération "release" est idempotente côté books-service (operationId).
        await bookService.updateStock(
          loan.bookId,
          'increment',
          loan.releaseOpId,
          loan.status === 'failed' ? loan.reserveOpId : undefined
        );
        loan.stockSyncPending = false;
        await loan.save();
        console.log(`[Reconcile] stock rendu pour le prêt ${loan._id}`);
      } catch (err) {
        if (err.response && err.response.status === 409) {
          // stock déjà au maximum => rien à rendre
          loan.stockSyncPending = false;
          await loan.save();
        } else {
          console.warn(`[Reconcile] prêt ${loan._id} : ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error('[Reconcile] erreur :', error);
  }
};

const initCronJobs = () => {
  // Every day at 8:00 AM - check overdue loans
  const timezone = process.env.CRON_TIMEZONE || 'Africa/Tunis';
  cron.schedule('0 8 * * *', async () => {
    await checkOverdueLoans();
  }, { timezone });

  // Every day at 8:00 AM - send due reminders
  cron.schedule('0 8 * * *', async () => {
    await sendDueReminders();
  }, { timezone });

  // Every 2 minutes - Saga reconciliation (stock sync + stale pending loans)
  cron.schedule('*/2 * * * *', async () => {
    await reconcileStock();
  });

  // Every Sunday at midnight - generate weekly statistics
  cron.schedule('0 0 * * 0', async () => {
    await generateWeeklyStats();
  }, { timezone });

  console.log('[CronJob] All cron jobs initialized');
};

module.exports = {
  initCronJobs,
  checkOverdueLoans,
  sendDueReminders,
  generateWeeklyStats,
  reconcileStock,
};
