const sequelize = require('../config/database');
const BookModel = require('./Book');
const CategoryModel = require('./Category');
const ReviewModel = require('./Review');
const StockOperationModel = require('./StockOperation');

const db = {};

// Initialize models
db.Book = BookModel(sequelize);
db.Category = CategoryModel(sequelize);
db.Review = ReviewModel(sequelize);
db.StockOperation = StockOperationModel(sequelize);

// Associations
db.Book.hasMany(db.Review, {
  foreignKey: 'bookId',
  as: 'reviews',
  onDelete: 'CASCADE',
});

db.Review.belongsTo(db.Book, {
  foreignKey: 'bookId',
  as: 'book',
});

// Store sequelize instances
db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;
