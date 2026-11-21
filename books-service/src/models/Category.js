const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Category name is required' },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Emoji icon for the category',
      },
      bookCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
    },
    {
      tableName: 'categories',
      timestamps: true,
    }
  );

  return Category;
};
