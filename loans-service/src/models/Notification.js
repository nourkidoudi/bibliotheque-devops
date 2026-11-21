const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['due_reminder', 'overdue', 'borrow_confirmation', 'return_confirmation', 'fine_notice', 'general'],
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    relatedLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      default: null,
    },
    dedupeKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching user notifications efficiently
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, sentAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
