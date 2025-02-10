const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config');
const User = require("../model/user");
const Org = require("../model/organization");

const PlansTracker = sequelize.define('PlansTracker', {
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
            model: Org,
            key: "id",
        },
        onUpdate: "CASCADE",
    },
    countOrganizations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countSubUsers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countReportsDownload: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countReportViewsPerDay: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countProducts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countBillsCreation: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countOrdersPerMonth:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }, 
    countBarcodeScans: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    countApiCalls: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'PlansTracker',
    timestamps: true,
});

// Commented out sync code as in original file
// PlansTracker.sync({ force: true })
//     .then(() => {
//         console.log('PlansTracker table has been created/recreated');
//     })
//     .catch((error) => {
//         console.error('Error syncing the PlansTracker model:', error);
//     });

// PlansTracker.sync({ alter: true })
//   .then(() => {
//     console.log('PlanTracker table has been updated.');
//   })
//   .catch((error) => {
//     console.error('Error syncing the PlanTracker model:', error);
//   });


module.exports = PlansTracker;