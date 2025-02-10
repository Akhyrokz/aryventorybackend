const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); // Import the Sequelize instance
const User = require('./user');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  catImage:{
    type:DataTypes.STRING,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
}, {
  tableName: 'Categories',
  timestamps: true 
});

// // Sync only the category model
// Category.sync({ alter: true })
//   .then(() => {
//     console.log('Category table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Category model:', error);
//   });
module.exports = Category;