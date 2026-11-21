const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const { authenticate, authorize } = require('../middleware/auth');

// GET /overview - Overview dashboard stats
router.get('/overview', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeLoans,
      returnedLoans,
      overdueLoans,
      returnedToday,
      borrowedToday,
      finesResult,
    ] = await Promise.all([
      Loan.countDocuments({ status: 'active' }),
      Loan.countDocuments({ status: 'returned' }),
      Loan.countDocuments({
        $or: [
          { status: 'overdue' },
          { status: 'active', dueDate: { $lt: new Date() } },
        ],
      }),
      Loan.countDocuments({
        status: 'returned',
        returnDate: { $gte: today },
      }),
      Loan.countDocuments({
        borrowDate: { $gte: today },
      }),
      Loan.aggregate([
        { $match: { fine: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalFines: { $sum: '$fine' },
            unpaidFines: {
              $sum: { $cond: [{ $eq: ['$finePaid', false] }, '$fine', 0] },
            },
          },
        },
      ]),
    ]);

    const totalFines = finesResult[0]?.totalFines || 0;
    const unpaidFines = finesResult[0]?.unpaidFines || 0;

    res.json({
      success: true,
      data: {
        activeLoans,
        returnedLoans,
        overdueLoans,
        returnedToday,
        borrowedToday,
        totalLoans: activeLoans + returnedLoans + overdueLoans,
        totalFines,
        unpaidFines,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /monthly - Monthly loan statistics for trends chart
router.get('/monthly', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Loan.aggregate([
      { $match: { borrowDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$borrowDate' },
            month: { $month: '$borrowDate' },
          },
          loans: { $sum: 1 },
          returns: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthsNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    const formatted = monthlyStats.map((item) => ({
      name: `${monthsNames[item._id.month - 1]} ${item._id.year}`,
      emprunts: item.loans,
      retours: item.returns,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /top-books - Most borrowed books
router.get('/top-books', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const topBooks = await Loan.aggregate([
      {
        $group: {
          _id: '$bookId',
          bookTitle: { $first: '$bookTitle' },
          bookAuthor: { $first: '$bookAuthor' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({ success: true, data: topBooks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /top-borrowers - Most active borrowers
router.get('/top-borrowers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const topBorrowers = await Loan.aggregate([
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          totalLoans: { $sum: 1 },
        },
      },
      { $sort: { totalLoans: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data: topBorrowers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
