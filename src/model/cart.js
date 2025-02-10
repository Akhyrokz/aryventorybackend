const { sequelize } = require("../config/config");
const { DataTypes } = require("sequelize");
const User = require("../model/user");
const Organization = require("../model/organization");
const SupplierProduct = require("../model/supplierProduct");
const SubUser =  require("../model/subUser")
// const Invoice=require("../model/invoice")

const Cart = sequelize.define(
  "Cart",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    shopkeeperId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Organization,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    subUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
          model: SubUser,
          key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }, 
    userType: {
      type: DataTypes.STRING,
      allowNull: true
    },
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
    supplierProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: SupplierProduct,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    itemTotalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "Cart",
    timestamps: true,
  }
);

//  Sync only the User model
// Cart.sync({ force: true })
//   .then(() => {
//     console.log('Cart table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Order model:', error);
//   });

module.exports = Cart;
