const { DataTypes } = require('sequelize');

/**
 * Journal des opérations de stock : garantit l'IDEMPOTENCE de
 * PATCH /api/books/:id/stock. Si loans-service rejoue la même opération
 * (retry après timeout), le stock n'est modifié qu'une seule fois.
 */
module.exports = (sequelize) => {
  const StockOperation = sequelize.define(
    'StockOperation',
    {
      operationId: {
        type: DataTypes.STRING(100),
        primaryKey: true,
      },
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM('increment', 'decrement'),
        allowNull: false,
      },
    },
    { tableName: 'stock_operations', timestamps: true, updatedAt: false }
  );
  return StockOperation;
};
