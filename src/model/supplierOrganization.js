const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/config");
const User = require("../model/user");

const SupplierOrganization = sequelize.define(
  "SupplierOrganization",
  {
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    orgName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    orgPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [7, 15],
      },
    },
    orgEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orgGST: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [4, 10],
      },
    },
    orgLogo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orgSignStamp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "SupplierOrganization",
    timestamps: true,
  }
);

// Sync only the User model

// SupplierOrganization.sync({ force: true })
//   .then(() => {
//     console.log('Supplier Organization table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the organization model:', error);
//   });

// SupplierOrganization.sync({ alter: true })
//   .then(() => {
//     console.log('Supplier Organization table has been updated.');
//   })
//   .catch((error) => {
//     console.error('Error syncing the organization model:', error);
//   });

module.exports = SupplierOrganization;
