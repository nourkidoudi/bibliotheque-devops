const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
    },
    bookId: {
      type: String,
      required: [true, 'Book ID is required'],
      index: true,
      trim: true,
    },
    bookTitle: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    bookAuthor: {
      type: String,
      trim: true,
      default: '',
    },
    bookIsbn: {
      type: String,
      trim: true,
      default: '',
    },
    borrowDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date;
      },
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'active', 'returned', 'overdue', 'lost', 'failed'],
        message: '{VALUE} is not a valid loan status',
      },
      default: 'active',
      index: true,
    },
    renewals: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    fine: {
      type: Number,
      default: 0,
      min: 0,
    },
    finePerDay: {
      type: Number,
      default: 0.5,
      min: 0,
    },
    finePaid: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // ── Saga : suivi de la synchronisation du stock avec books-service ──
    // true  => le stock du livre doit encore être RENDU (retour/compensation à rejouer)
    stockSyncPending: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Identifiants d'opérations idempotentes envoyés à books-service
    reserveOpId: { type: String, default: null },
    releaseOpId: { type: String, default: null },
    failureReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
loanSchema.index({ userId: 1, status: 1 });
loanSchema.index({ bookId: 1, status: 1 });
loanSchema.index({ dueDate: 1, status: 1 });

// Virtual: isOverdue
loanSchema.virtual('isOverdue').get(function () {
  if (['returned', 'lost', 'pending', 'failed'].includes(this.status)) {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual: daysOverdue
loanSchema.virtual('daysOverdue').get(function () {
  if (this.status === 'returned' || this.status === 'lost') {
    return 0;
  }
  const now = new Date();
  if (now <= this.dueDate) {
    return 0;
  }
  const diffMs = now - this.dueDate;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// Virtual: totalFine
loanSchema.virtual('totalFine').get(function () {
  if (this.fine > 0) {
    return this.fine;
  }
  if (this.status === 'returned' || this.status === 'lost') {
    return this.fine;
  }
  const now = new Date();
  if (now <= this.dueDate) {
    return 0;
  }
  const diffMs = now - this.dueDate;
  const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return daysLate * this.finePerDay;
});

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;
