const sequelize = require('../config/database');
const defineUser = require('./User');

const db = {};

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

// Initialize models
db.User = defineUser(sequelize);

// Run associations (extend here when adding related models)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
