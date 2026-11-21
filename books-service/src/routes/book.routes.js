const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../models');
const { authenticate, authorize, verifyServiceKey } = require('../middleware/auth');
const {
  validateCreateBook,
  validateUpdateBook,
  validateCreateReview,
  validateStockUpdate,
  validateUUIDParam,
} = require('../middleware/validate');
const upload = require('../middleware/upload');

const Book = db.Book;
const Review = db.Review;
const Category = db.Category;

// ─────────────────────────────────────────────
// GET / — List books with pagination, search, filter, sort
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      q,
      category,
      language,
      available,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isActive: true };

    // Full-text search on title, author, isbn
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: searchTerm } },
        { author: { [Op.iLike]: searchTerm } },
        { isbn: { [Op.iLike]: searchTerm } },
        { description: { [Op.iLike]: searchTerm } },
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Language filter
    if (language) {
      where.language = language;
    }

    // Availability filter
    if (available === 'true') {
      where.availableCopies = { [Op.gt]: 0 };
    }

    // Validate sort field
    const allowedSortFields = ['title', 'author', 'publishYear', 'rating', 'createdAt'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: books } = await Book.findAndCountAll({
      where,
      order: [[validSortBy, validSortOrder]],
      limit: limitNum,
      offset,
      attributes: {
        exclude: ['description'],
      },
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: count,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error listing books:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ─────────────────────────────────────────────
// GET /featured — Top-rated and recently added
// ─────────────────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const topRated = await Book.findAll({
      where: { isActive: true, totalRatings: { [Op.gte]: 1 } },
      order: [['rating', 'DESC']],
      limit: 6,
      attributes: { exclude: ['description'] },
    });

    const recentlyAdded = await Book.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      limit: 6,
      attributes: { exclude: ['description'] },
    });

    res.json({
      success: true,
      data: {
        topRated,
        recentlyAdded,
      },
    });
  } catch (error) {
    console.error('Error fetching featured books:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving featured books',
    });
  }
});

// ─────────────────────────────────────────────
// GET /stats — Book statistics (librarian/admin)
// ─────────────────────────────────────────────
router.get('/stats', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const totalBooks = await Book.count({ where: { isActive: true } });
    const totalCopies = await Book.sum('totalCopies', { where: { isActive: true } }) || 0;
    const totalAvailable = await Book.sum('availableCopies', { where: { isActive: true } }) || 0;
    const totalBorrowed = totalCopies - totalAvailable;

    // Books by category
    const byCategory = await Book.findAll({
      where: { isActive: true },
      attributes: [
        'category',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalCopies')), 'totalCopies'],
        [fn('SUM', col('availableCopies')), 'availableCopies'],
      ],
      group: ['category'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    // Books by language
    const byLanguage = await Book.findAll({
      where: { isActive: true },
      attributes: [
        'language',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['language'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    // Most borrowed (least available relative to total)
    const mostBorrowed = await Book.findAll({
      where: {
        isActive: true,
        totalCopies: { [Op.gt]: 0 },
      },
      attributes: [
        'id', 'title', 'author', 'category',
        'totalCopies', 'availableCopies',
        [literal('"totalCopies" - "availableCopies"'), 'borrowedCopies'],
      ],
      order: [[literal('"totalCopies" - "availableCopies"'), 'DESC']],
      limit: 10,
      raw: true,
    });

    // Top rated
    const topRated = await Book.findAll({
      where: { isActive: true, totalRatings: { [Op.gte]: 1 } },
      attributes: ['id', 'title', 'author', 'rating', 'totalRatings'],
      order: [['rating', 'DESC']],
      limit: 10,
      raw: true,
    });

    // Recently added
    const recentlyAdded = await Book.findAll({
      where: { isActive: true },
      attributes: ['id', 'title', 'author', 'category', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true,
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalBooks,
          totalCopies,
          totalAvailable,
          totalBorrowed,
        },
        byCategory,
        byLanguage,
        mostBorrowed,
        topRated,
        recentlyAdded,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
    });
  }
});

// ─────────────────────────────────────────────
// GET /:id — Get single book with reviews
// ─────────────────────────────────────────────
router.get('/:id', validateUUIDParam, async (req, res) => {
  try {
    const book = await Book.findOne({
      where: { id: req.params.id, isActive: true },
      include: [
        {
          model: Review,
          as: 'reviews',
          where: { isApproved: true },
          required: false,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving book',
    });
  }
});

// ─────────────────────────────────────────────
// POST / — Create a new book (librarian/admin)
// ─────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('admin', 'librarian'),
  validateCreateBook,
  async (req, res) => {
    try {
      const {
        isbn, title, author, description, category, publisher,
        publishYear, pages, language, totalCopies, availableCopies,
        location, tags,
      } = req.body;

      // Check for duplicate ISBN
      const existing = await Book.findOne({ where: { isbn } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A book with this ISBN already exists',
        });
      }

      const book = await Book.create({
        isbn,
        title,
        author,
        description,
        category,
        publisher,
        publishYear: publishYear ? parseInt(publishYear, 10) : null,
        pages: pages ? parseInt(pages, 10) : null,
        language: language || 'French',
        totalCopies: totalCopies ? parseInt(totalCopies, 10) : 1,
        availableCopies: availableCopies !== undefined ? parseInt(availableCopies, 10) : (totalCopies ? parseInt(totalCopies, 10) : 1),
        location,
        tags: tags || [],
      });

      // Update category book count
      await Category.increment('bookCount', {
        by: 1,
        where: { name: category },
      });

      res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: book,
      });
    } catch (error) {
      console.error('Error creating book:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'A book with this ISBN already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating book',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// ─────────────────────────────────────────────
// PUT /:id — Update a book (librarian/admin)
// ─────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  validateUUIDParam,
  validateUpdateBook,
  async (req, res) => {
    try {
      const book = await Book.findOne({
        where: { id: req.params.id, isActive: true },
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      const oldCategory = book.category;

      const allowedFields = [
        'isbn', 'title', 'author', 'description', 'category', 'publisher',
        'publishYear', 'pages', 'language', 'totalCopies', 'availableCopies',
        'location', 'tags',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await book.update(updateData);

      // Update category counts if category changed
      if (updateData.category && updateData.category !== oldCategory) {
        await Category.decrement('bookCount', {
          by: 1,
          where: { name: oldCategory, bookCount: { [Op.gt]: 0 } },
        });
        await Category.increment('bookCount', {
          by: 1,
          where: { name: updateData.category },
        });
      }

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: book,
      });
    } catch (error) {
      console.error('Error updating book:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'A book with this ISBN already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating book',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /:id — Soft delete a book (admin only)
// ─────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateUUIDParam,
  async (req, res) => {
    try {
      const book = await Book.findOne({
        where: { id: req.params.id, isActive: true },
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      await book.update({ isActive: false });

      // Decrement category book count
      await Category.decrement('bookCount', {
        by: 1,
        where: { name: book.category, bookCount: { [Op.gt]: 0 } },
      });

      res.json({
        success: true,
        message: 'Book deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting book',
      });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /:id/stock — Internal: update available copies
// ─────────────────────────────────────────────
router.patch(
  '/:id/stock',
  verifyServiceKey,
  validateUUIDParam,
  validateStockUpdate,
  async (req, res) => {
    try {
      const { action, operationId, compensates } = req.body;

      // Transaction + verrou de ligne (SELECT ... FOR UPDATE) : deux emprunts
      // simultanés ne peuvent plus décrémenter le même stock en même temps.
      const result = await db.sequelize.transaction(async (t) => {
        const book = await Book.findOne({
          where: { id: req.params.id, isActive: true },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!book) return { status: 404, message: 'Book not found' };

        // Idempotence : opération déjà appliquée => on renvoie l'état courant
        if (operationId) {
          const already = await db.StockOperation.findByPk(operationId, { transaction: t });
          if (already) return { status: 200, book, replayed: true };
        }

        // Compensation d'une réservation : on ne rend le stock QUE si la
        // réservation a réellement été appliquée. Sinon on pose une "pierre
        // tombale" pour qu'une réservation retardataire soit ignorée.
        if (action === 'increment' && compensates) {
          const reserved = await db.StockOperation.findByPk(compensates, { transaction: t });
          if (!reserved) {
            await db.StockOperation.create(
              { operationId: compensates, bookId: book.id, action: 'decrement' },
              { transaction: t }
            );
            if (operationId) {
              await db.StockOperation.create(
                { operationId, bookId: book.id, action: 'increment' },
                { transaction: t }
              );
            }
            return { status: 200, book, replayed: true };
          }
        }

        if (action === 'decrement') {
          if (book.availableCopies <= 0) {
            return { status: 409, message: 'No available copies to lend' };
          }
          await book.update({ availableCopies: book.availableCopies - 1 }, { transaction: t });
        } else {
          if (book.availableCopies >= book.totalCopies) {
            return { status: 409, message: 'Available copies cannot exceed total copies' };
          }
          await book.update({ availableCopies: book.availableCopies + 1 }, { transaction: t });
        }

        if (operationId) {
          await db.StockOperation.create(
            { operationId, bookId: book.id, action },
            { transaction: t }
          );
        }
        return { status: 200, book, replayed: false };
      });

      if (result.status !== 200) {
        return res.status(result.status).json({ success: false, message: result.message });
      }

      res.json({
        success: true,
        message: result.replayed ? 'Operation already applied' : `Stock ${action}ed successfully`,
        replayed: result.replayed,
        data: {
          id: result.book.id,
          title: result.book.title,
          totalCopies: result.book.totalCopies,
          availableCopies: result.book.availableCopies,
        },
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating stock',
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST /:id/reviews — Add a review (authenticated user)
// ─────────────────────────────────────────────
router.post(
  '/:id/reviews',
  authenticate,
  validateUUIDParam,
  validateCreateReview,
  async (req, res) => {
    try {
      const book = await Book.findOne({
        where: { id: req.params.id, isActive: true },
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      // Check if user already reviewed this book
      const existingReview = await Review.findOne({
        where: {
          bookId: book.id,
          userId: req.user.id,
        },
      });

      if (existingReview) {
        return res.status(409).json({
          success: false,
          message: 'You have already reviewed this book',
        });
      }

      const { rating, comment } = req.body;

      const review = await Review.create({
        bookId: book.id,
        userId: req.user.id,
        userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
        rating: parseInt(rating, 10),
        comment,
      });

      // Recalculate book rating
      const allReviews = await Review.findAll({
        where: { bookId: book.id, isApproved: true },
        attributes: ['rating'],
        raw: true,
      });

      const totalRatings = allReviews.length;
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

      await book.update({
        rating: Math.round(avgRating * 10) / 10,
        totalRatings,
      });

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: review,
      });
    } catch (error) {
      console.error('Error adding review:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'You have already reviewed this book',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error adding review',
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST /upload-cover/:id — Upload cover image (librarian/admin)
// ─────────────────────────────────────────────
router.post(
  '/upload-cover/:id',
  authenticate,
  authorize('admin', 'librarian'),
  validateUUIDParam,
  (req, res, next) => {
    upload.single('cover')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds the 5MB limit',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file',
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      const book = await Book.findOne({
        where: { id: req.params.id, isActive: true },
      });

      if (!book) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      // Resize image with sharp
      const resizedFilename = `cover-resized-${path.basename(req.file.filename, path.extname(req.file.filename))}.webp`;
      const resizedPath = path.join(path.dirname(req.file.path), resizedFilename);

      await sharp(req.file.path)
        .resize(400, 600, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(resizedPath);

      // Remove original file
      fs.unlinkSync(req.file.path);

      // Delete old cover image if exists
      if (book.coverImage) {
        const oldPath = path.join(process.cwd(), book.coverImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const coverImagePath = `uploads/${resizedFilename}`;
      await book.update({ coverImage: coverImagePath });

      res.json({
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: coverImagePath,
        },
      });
    } catch (error) {
      console.error('Error uploading cover:', error);
      // Clean up on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: 'Error uploading cover image',
      });
    }
  }
);

module.exports = router;
