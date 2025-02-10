const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); // Import the Sequelize instance
const User = require('./user'); // Import the User model


const SupplierProduct = sequelize.define('SupplierProduct', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { // Set supplierId as a foreign key
            model: User, // Reference the User model
            key: 'id' // Reference the 'id' field in the User model
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    productCategory: {
        type: DataTypes.STRING,
        allowNull: false
    },
    productBrand: {
        type: DataTypes.STRING,
        allowNull: true
    },
    productModel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    productName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    productDescription: {
        type: DataTypes.STRING(4000),
        allowNull: false
    },
    productColor: {
        type: DataTypes.STRING,
        allowNull: true
    },
    productQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // considering this as a selling price
    productPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // buying price
    purchasePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    MRP:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    coverImage: {
        type: DataTypes.STRING(4000),
        allowNull: true
    },
    HSNCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    BarCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    RamRom: {
        type: DataTypes.STRING,
        allowNull: true
    },
    chargePort: {
        type: DataTypes.STRING,
        allowNull: true
    },
    batteryCapacity: {
        type: DataTypes.STRING,
        allowNull: true
    },
    subCategory: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    }
}, {
    tableName: 'SupplierProduct',
    timestamps: true 
});
// Set up association

// // Sync only the Supplier model
// SupplierProduct.sync({ alter: true })
//   .then(() => {
//     console.log('SupplierProduct table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Supplier model:', error);
//   });
module.exports = SupplierProduct;