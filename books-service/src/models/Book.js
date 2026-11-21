const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Book = sequelize.define(
    'Book',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      isbn: {
        type: DataTypes.STRING(17),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'ISBN is required' },
          is: {
            args: /^[\d-]{10,20}$/,
            msg: 'ISBN must be a valid ISBN-10 or ISBN-13 format',
          },
        },
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Title is required' },
          len: { args: [1, 500], msg: 'Title must be between 1 and 500 characters' },
        },
      },
      author: {
        type: DataTypes.STRING(300),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Author is required' },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Category is required' },
        },
      },
      publisher: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      publishYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Publish year must be a positive number' },
          max: { args: [new Date().getFullYear() + 1], msg: 'Publish year cannot be in the future' },
        },
      },
      pages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: { args: [1], msg: 'Pages must be at least 1' },
        },
      },
      language: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'French',
      },
      coverImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      totalCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [0], msg: 'Total copies cannot be negative' },
        },
      },
      availableCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [0], msg: 'Available copies cannot be negative' },
        },
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Shelf location, e.g. A-12-3',
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      totalRatings: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'books',
      timestamps: true,
      indexes: [
        {
          fields: ['title'],
        },
        {
          fields: ['author'],
        },
        {
          fields: ['category'],
        },
        {
          fields: ['isActive'],
        },
        {
          fields: ['isbn'],
          unique: true,
        },
        {
          fields: ['language'],
        },
        {
          fields: ['rating'],
        },
      ],
    }
  );

  return Book;
};
