const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); // Import the Sequelize instance
const User = require('./user');
const Inventory = require('./inventory');
const SubUser = require('./subUser');
const Org = require('./organization');

// Define the model for the CustomerBill table
const CustomerBill = sequelize.define('customerBill', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    customerName: {
        type: DataTypes.STRING,
        allowNull: true,  
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,  
    },
    customerGst: {
        type: DataTypes.STRING,  
        allowNull: true,  
    },
    customerAddress: {
        type: DataTypes.STRING,
        allowNull: true,  
    },
    invoiceNo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    estimatedInvoice: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isValidBill: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue:true
    },
    estimatedInvoice: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isValidBill: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    invoiceDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    productName: {
        type: DataTypes.STRING,
        allowNull: false,  
    },
    productModel: {
        type: DataTypes.STRING,
        allowNull: true, 
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,  
    },
    productPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,  
    },
    IMEI1: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    IMEI2: {
        type: DataTypes.STRING,
        allowNull: true, 
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: true,  
    },
    productTotal: {
        type: DataTypes.FLOAT,
        allowNull: false,  
    },
    discount: {
        type: DataTypes.FLOAT,
        allowNull: true, 
    },
    SGST: {
        type: DataTypes.FLOAT,
        allowNull: true,  
    },
    CGST: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    finalTotal: {
        type: DataTypes.FLOAT,
        allowNull: false, 
    },
    signatureImage: {
        type: DataTypes.STRING(4000),
        allowNull: true,
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
            model: Org, 
            key: 'id' 
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    userType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    inventoryId: {
        type: DataTypes.BIGINT,
        references: {
            model: Inventory,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
}, {
    tableName: 'customer_bills', 
    timestamps: true,  
});

// Sync the model with the database (this will create the table if it doesn't exist)
// CustomerBill.sync({ force: true })
//     .then(() => {
//         console.log('CustomerBill table has been created.');
//     })
//     .catch(error => {
//         console.error('Error creating table:', error);
//     });

module.exports = CustomerBill;
