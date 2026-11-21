const express = require('express');
const router = express.Router();

const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');

router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
