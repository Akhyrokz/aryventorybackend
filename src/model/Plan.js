const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config');

const Plan = sequelize.define('Plan', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    planName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    trialPeriodDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    maxOrganizations: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    maxSubUsers: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    maxReportsDownload: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
    },
    maxReportViewsPerDay: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
    },
    maxProducts: {
        type: DataTypes.INTEGER,
        defaultValue: 20,
    },
    maxBillsCreation: {
        type: DataTypes.INTEGER,
        defaultValue: 20,
    },
    maxOrdersPerMonth: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
    },
    maxBarcodeScans: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
    },
    maxApiCalls: {
        type: DataTypes.INTEGER,
        defaultValue: 200,
    },
    supportLevel: {
        type: DataTypes.ENUM('None', 'Email', 'Phone', 'Email Phone',  ),
        defaultValue: 'None',
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    billingCycle: {
        type: DataTypes.ENUM('Monthly', 'Yearly', 'Quarterly', 'Half-Yearly'),
        defaultValue: 'Monthly',
    }
}, {
    tableName: 'Plans',
    timestamps: true,

});

// Commented out sync code as in original file
// Plan.sync({ Alter: true })
//     .then(() => {
//         console.log('Plans table has been created/recreated');
//     })
//     .catch((error) => {
//         console.error('Error syncing the Plans model:', error);
//     });

module.exports = Plan;