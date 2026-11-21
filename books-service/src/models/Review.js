const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define(
    'Review',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User ID from JWT (users-service)',
      },
      userName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: 'Rating must be between 1 and 5' },
          max: { args: [5], msg: 'Rating must be between 1 and 5' },
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isApproved: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'reviews',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['bookId', 'userId'],
          name: 'reviews_book_user_unique',
        },
        {
          fields: ['bookId'],
        },
        {
          fields: ['userId'],
        },
      ],
    }
  );

  return Review;
};
