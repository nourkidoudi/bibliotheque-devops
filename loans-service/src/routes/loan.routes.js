const express = require('express');
const { randomUUID } = require('crypto');
const router = express.Router();
const Loan = require('../models/Loan');
const bookService = require('../services/bookService');
const notificationService = require('../services/notificationService');
const { authenticate, authorize } = require('../middleware/auth');

// ─────────────────────────────────────────────
// POST /borrow - Borrow a book
// ─────────────────────────────────────────────
router.router = router;
router.post('/borrow', authenticate, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ success: false, message: 'L\'identifiant du livre est requis.' });
    }

    const userId = req.user.id || req.user.userId;
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || 'Utilisateur';
    const userEmail = req.user.email;

    // Check maximum active loans (limit: 5)
    const activeLoansCount = await Loan.countDocuments({
      userId,
      status: { $in: ['pending', 'active', 'overdue'] },
    });

    if (activeLoansCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez atteint la limite maximale de 5 emprunts actifs simultanés.',
      });
    }

    // Check for unpaid overdue fines exceeding 10 dinars
    const overdueLoans = await Loan.find({
      userId,
      status: 'overdue',
      finePaid: false,
    });
    const totalUnpaidFine = overdueLoans.reduce((sum, l) => sum + (l.fine || 0), 0);
    if (totalUnpaidFine > 10) {
      return res.status(403).json({
        success: false,
        message: `Vous avez ${totalUnpaidFine} DT d'amendes impayées. Veuillez régulariser votre situation avant d'emprunter.`,
      });
    }

    // Check if user already has an active loan for this book
    const existingLoan = await Loan.findOne({
      userId,
      bookId,
      status: { $in: ['pending', 'active', 'overdue'] },
    });
    if (existingLoan) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un emprunt en cours pour ce livre.',
      });
    }

    // Fetch book details from books-service
    let book;
    try {
      const bookRes = await bookService.getBook(bookId);
      book = bookRes?.data || bookRes;
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Le service des livres est momentanément indisponible. Réessayez dans quelques instants.',
      });
    }

    if (!book) {
      return res.status(404).json({ success: false, message: 'Livre introuvable dans le catalogue.' });
    }

    if (book.availableCopies <= 0) {
      return res.status(409).json({
        success: false,
        message: 'Cet ouvrage n\'est actuellement plus disponible en stock.',
      });
    }

    // ── SAGA ORCHESTRÉE (loans-service = orchestrateur) ─────────────────────
    //  Étape 1 : créer l'emprunt en statut "pending" (MongoDB)
    //  Étape 2 : réserver le stock dans books-service (PostgreSQL, idempotent)
    //  Étape 3a : succès  -> emprunt "active"
    //  Étape 3b : échec   -> COMPENSATION : emprunt "failed" (+ libération du stock si besoin)
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const reserveOpId = `reserve-${randomUUID()}`;
    const loan = await Loan.create({
      userId,
      userName,
      userEmail,
      bookId,
      bookTitle: book.title,
      bookAuthor: book.author || '',
      bookIsbn: book.isbn || '',
      borrowDate,
      dueDate,
      status: 'pending',
      renewals: 0,
      fine: 0,
      reserveOpId,
    });

    try {
      await bookService.updateStock(bookId, 'decrement', reserveOpId);
    } catch (err) {
      // Compensation : l'emprunt n'a jamais existé du point de vue de l'utilisateur.
      const definitive = err.response && err.response.status < 500; // ex. 409 stock épuisé
      loan.status = 'failed';
      loan.failureReason = err.message;
      // Si on ignore si books-service a appliqué la réservation (timeout/5xx),
      // on rend le stock de façon idempotente via le job de réconciliation.
      loan.stockSyncPending = !definitive;
      loan.releaseOpId = !definitive ? `release-${randomUUID()}` : null;
      await loan.save();

      const status = definitive ? 409 : 503;
      return res.status(status).json({
        success: false,
        message: definitive
          ? 'Cet ouvrage n\'est plus disponible en stock.'
          : 'Réservation impossible pour le moment (service des livres indisponible). Aucun emprunt n\'a été créé.',
      });
    }

    loan.status = 'active';
    await loan.save();
    const newLoan = loan;

    try {
      await notificationService.createBorrowConfirmation(loan);
    } catch (notifErr) {
      console.warn('Failed to send borrow notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Emprunt enregistré avec succès ! Bonne lecture.',
      data: newLoan,
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'emprunt.' });
  }
});

// ─────────────────────────────────────────────
// PUT /:id/return - Return a book
// ─────────────────────────────────────────────
router.put('/:id/return', authenticate, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });
    }

    const userId = req.user.id || req.user.userId;
    const isLibrarianOrAdmin = ['librarian', 'admin'].includes(req.user.role);

    if (loan.userId !== userId && !isLibrarianOrAdmin) {
      return res.status(403).json({ success: false, message: 'Action non autorisée sur cet emprunt.' });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Ce livre a déjà été retourné.' });
    }

    const returnDate = new Date();
    let fine = loan.fine || 0;

    // If returning late, recalculate fine
    if (returnDate > new Date(loan.dueDate)) {
      const daysOverdue = Math.ceil((returnDate - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
      fine = Math.max(fine, daysOverdue * (loan.finePerDay || 0.5));
    }

    loan.status = 'returned';
    loan.returnDate = returnDate;
    loan.fine = fine;
    loan.releaseOpId = loan.releaseOpId || `release-${randomUUID()}`;

    // Rendre le stock (idempotent). Si books-service est indisponible, l'emprunt
    // reste "returned" et le job de réconciliation rejouera l'opération plus tard
    // (cohérence éventuelle au lieu d'un état perdu).
    try {
      await bookService.updateStock(loan.bookId, 'increment', loan.releaseOpId);
      loan.stockSyncPending = false;
    } catch (stockErr) {
      console.warn('Stock non rendu, sera réconcilié :', stockErr.message);
      loan.stockSyncPending = true;
    }
    await loan.save();

    // Create notification for user
    try {
      await notificationService.createReturnConfirmation(loan);
    } catch (notifErr) {
      console.warn('Failed to send return notification:', notifErr.message);
    }
    if (fine > 0) {
      try {
        await notificationService.createFineNotice(loan, fine);
      } catch (notifErr) {
        console.warn('Failed to send fine notification:', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Livre retourné avec succès !',
      data: loan,
    });
  } catch (error) {
    console.error('Error returning loan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /:id/renew - Renew loan (+14 days)
// ─────────────────────────────────────────────
router.put('/:id/renew', authenticate, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });
    }

    const userId = req.user.id || req.user.userId;
    if (loan.userId !== userId && !['librarian', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les emprunts actifs peuvent être renouvelés.',
      });
    }

    if (loan.renewals >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà atteint la limite maximale de 2 renouvellements.',
      });
    }

    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 14);

    loan.dueDate = newDueDate;
    loan.renewals += 1;
    await loan.save();

    res.json({
      success: true,
      message: `Emprunt renouvelé avec succès jusqu'au ${newDueDate.toLocaleDateString('fr-FR')}.`,
      data: loan,
    });
  } catch (error) {
    console.error('Error renewing loan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /my-loans - Current user loans
// ─────────────────────────────────────────────
router.get('/my-loans', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      Loan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Loan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: loans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /my-loans/active - Active loans of user
// ─────────────────────────────────────────────
router.get('/my-loans/active', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const loans = await Loan.find({
      userId,
      status: { $in: ['active', 'overdue'] },
    }).sort({ dueDate: 1 });

    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET / - All loans (librarian / admin)
// ─────────────────────────────────────────────
router.get('/', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const { status, userId, bookId, search, page = 1, limit = 15 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (bookId) query.bookId = bookId;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { bookTitle: { $regex: search, $options: 'i' } },
        { bookIsbn: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      Loan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Loan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: loans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /overdue - Overdue loans
// ─────────────────────────────────────────────
router.get('/overdue', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const loans = await Loan.find({
      $or: [
        { status: 'overdue' },
        { status: 'active', dueDate: { $lt: new Date() } },
      ],
    }).sort({ dueDate: 1 });

    res.json({ success: true, count: loans.length, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /:id - Single loan details
// ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });

    const userId = req.user.id || req.user.userId;
    if (loan.userId !== userId && !['librarian', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /:id/fine/pay - Mark fine as paid
// ─────────────────────────────────────────────
router.put('/:id/fine/pay', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });

    loan.finePaid = true;
    await loan.save();

    res.json({
      success: true,
      message: 'Amende marquée comme réglée avec succès.',
      data: loan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /:id/lost - Mark book as lost
// ─────────────────────────────────────────────
router.put('/:id/lost', authenticate, authorize('librarian', 'admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });

    loan.status = 'lost';
    loan.fine = (loan.fine || 0) + 30; // 30 DT replacement fee
    await loan.save();

    res.json({
      success: true,
      message: 'Ouvrage marqué comme perdu. Pénalité appliquée.',
      data: loan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
