// models/brand.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); // Import the Sequelize instance
const User = require('./user');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { 
        model: User, 
        key: 'id' 
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
}, {
  tableName: 'Brands',
  timestamps: true // Set to true if you want timestamps
});
// // Sync only the Brand model
// Brand.sync({ force: true })
//   .then(() => {
//     console.log('Brand table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Brand model:', error);
//   });
module.exports = Brand;