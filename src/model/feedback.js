const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/config");

const Feedback = sequelize.define(
  "Feedback",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['Shopkeeper', 'Supplier', 'Manager', 'SalesPerson']],
      },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
  },
  {
    tableName: "Feedbacks",
    timestamps: true,
  }
);
// Feedback.sync({ force: true })
//   .then(() => {
//     console.log('Feedbacks table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Feedbacks model:', error);
//   });
module.exports = Feedback;
