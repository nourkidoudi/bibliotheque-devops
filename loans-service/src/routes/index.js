const express = require('express');
const router = express.Router();

const loanRoutes = require('./loan.routes');
const notificationRoutes = require('./notification.routes');
const statsRoutes = require('./stats.routes');

router.use('/loans', loanRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
