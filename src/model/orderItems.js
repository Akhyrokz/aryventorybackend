const { sequelize } = require('../config/config');
const { DataTypes } = require('sequelize');
const Order = require('../model/order');
const User = require('../model/user');
const SupplierProduct= require('../model/supplierProduct');

const OrderItems = sequelize.define('OrderItems', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
     orderId: {
        type: DataTypes.INTEGER,
        references: {
            model: Order,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    supplierProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { 
      model: SupplierProduct, 
      key: 'id' 
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    productPrice:{
        type: DataTypes.INTEGER,
        allowNull: true,
    },

}, {
    tableName: 'OrderItems',
    timestamps: true, 
});


// Sync the OrderItems model
// OrderItems.sync({ alter: true })
//     .then(() => {
//         console.log('OrderItems table has been recreated (dropped if existed and recreated).');
//     })
//     .catch((error) => {
//         console.error('Error syncing the OrderItems model:', error);
//     });

module.exports = OrderItems;