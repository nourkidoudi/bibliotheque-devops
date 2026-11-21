const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: 'Must be a valid email address',
          },
          notEmpty: {
            msg: 'Email is required',
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Password is required',
          },
          len: {
            args: [8, 128],
            msg: 'Password must be between 8 and 128 characters',
          },
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'First name is required',
          },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Last name is required',
          },
        },
      },
      role: {
        type: DataTypes.ENUM('student', 'librarian', 'admin'),
        defaultValue: 'student',
        allowNull: false,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      studentId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: 'users',
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.refreshToken;
    return values;
  };

  return User;
};
