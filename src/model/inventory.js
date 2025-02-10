const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); // Import the Sequelize instance
const User = require('./user');
// const SupplierProduct= require('./supplierProduct');
const SubUser = require('./subUser');
const Org = require("./organization");
// Define the Inventory model
const Inventory = sequelize.define('Inventory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    shopkeeperId: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    subUserId: {
        type: DataTypes.BIGINT,
        references: {
            model: SubUser,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    orgId: { 
        type: DataTypes.BIGINT,
        references: {
            model: Org, // Reference the SupplierProduct model
            key: 'id' // Reference the 'id' field in the SupplierProduct model
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    userType:{
        type: DataTypes.STRING,
        allowNull: true
    },
    productCategory: {
        type: DataTypes.STRING,
        allowNull: true
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
    productPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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
    quantity: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    lowStockQuantity:{
        type: DataTypes.BIGINT,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
},{
    tableName: 'Inventory', // Specify the table name explicitly
    timestamps: true // Set to true if you want Sequelize to manage createdAt/updatedAt timestamps
});

// Sync only the Inventory model (if needed)
// Inventory.sync({ force: true })
//   .then(() => {
//     console.log('Inventory table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Inventory model:', error);
//   });
module.exports = Inventory;