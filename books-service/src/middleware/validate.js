const { validationResult, body, param, query } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
};

/**
 * Validation rules for creating a book.
 */
const validateCreateBook = [
  body('isbn')
    .notEmpty().withMessage('ISBN is required')
    .matches(/^(\d{10}|\d{13}|\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-\d{1})$/)
    .withMessage('Invalid ISBN format'),
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 500 }).withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('author')
    .notEmpty().withMessage('Author is required')
    .isLength({ min: 1, max: 300 }).withMessage('Author must be between 1 and 300 characters')
    .trim(),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('category')
    .notEmpty().withMessage('Category is required')
    .trim(),
  body('publisher')
    .optional()
    .isString().withMessage('Publisher must be a string')
    .trim(),
  body('publishYear')
    .optional()
    .isInt({ min: 0, max: new Date().getFullYear() + 1 })
    .withMessage(`Publish year must be between 0 and ${new Date().getFullYear() + 1}`),
  body('pages')
    .optional()
    .isInt({ min: 1 }).withMessage('Pages must be at least 1'),
  body('language')
    .optional()
    .isString().withMessage('Language must be a string')
    .trim(),
  body('totalCopies')
    .optional()
    .isInt({ min: 0 }).withMessage('Total copies must be 0 or more'),
  body('availableCopies')
    .optional()
    .isInt({ min: 0 }).withMessage('Available copies must be 0 or more'),
  body('location')
    .optional()
    .isString().withMessage('Location must be a string')
    .trim(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
];

/**
 * Validation rules for updating a book.
 */
const validateUpdateBook = [
  body('isbn')
    .optional()
    .matches(/^(\d{10}|\d{13}|\d{3}-\d{1,5}-\d{1,7}-\d{1,7}-\d{1})$/)
    .withMessage('Invalid ISBN format'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 500 }).withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('author')
    .optional()
    .isLength({ min: 1, max: 300 }).withMessage('Author must be between 1 and 300 characters')
    .trim(),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('category')
    .optional()
    .isString().withMessage('Category must be a string')
    .trim(),
  body('publisher')
    .optional()
    .isString().withMessage('Publisher must be a string')
    .trim(),
  body('publishYear')
    .optional()
    .isInt({ min: 0, max: new Date().getFullYear() + 1 })
    .withMessage(`Publish year must be between 0 and ${new Date().getFullYear() + 1}`),
  body('pages')
    .optional()
    .isInt({ min: 1 }).withMessage('Pages must be at least 1'),
  body('language')
    .optional()
    .isString().withMessage('Language must be a string')
    .trim(),
  body('totalCopies')
    .optional()
    .isInt({ min: 0 }).withMessage('Total copies must be 0 or more'),
  body('availableCopies')
    .optional()
    .isInt({ min: 0 }).withMessage('Available copies must be 0 or more'),
  body('location')
    .optional()
    .isString().withMessage('Location must be a string')
    .trim(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  handleValidationErrors,
];

/**
 * Validation rules for creating a review.
 */
const validateCreateReview = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isString().withMessage('Comment must be a string')
    .isLength({ max: 2000 }).withMessage('Comment must be less than 2000 characters')
    .trim(),
  handleValidationErrors,
];

/**
 * Validation rules for stock updates.
 */
const validateStockUpdate = [
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['increment', 'decrement']).withMessage('Action must be "increment" or "decrement"'),
  body('compensates')
    .optional()
    .isString().withMessage('compensates must be a string'),
  body('operationId')
    .optional()
    .isString().withMessage('operationId must be a string')
    .isLength({ min: 8, max: 100 }).withMessage('operationId must be between 8 and 100 characters'),
  handleValidationErrors,
];

/**
 * Validation rules for creating a category.
 */
const validateCreateCategory = [
  body('name')
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('icon')
    .optional()
    .isString().withMessage('Icon must be a string')
    .isLength({ max: 10 }).withMessage('Icon must be at most 10 characters'),
  handleValidationErrors,
];

/**
 * Validation for UUID params.
 */
const validateUUIDParam = [
  param('id')
    .isUUID(4).withMessage('Invalid ID format'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateCreateBook,
  validateUpdateBook,
  validateCreateReview,
  validateStockUpdate,
  validateCreateCategory,
  validateUUIDParam,
};
