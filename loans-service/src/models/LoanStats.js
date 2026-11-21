const mongoose = require('mongoose');

const loanStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      unique: true,
    },
    totalLoans: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReturns: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOverdue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFines: {
      type: Number,
      default: 0,
      min: 0,
    },
    topBooks: [
      {
        bookId: { type: String, required: true },
        bookTitle: { type: String, required: true },
        count: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

loanStatsSchema.index({ date: -1 });

const LoanStats = mongoose.model('LoanStats', loanStatsSchema);

module.exports = LoanStats;
