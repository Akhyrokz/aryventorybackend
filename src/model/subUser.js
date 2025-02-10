const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/config");
const User = require("../model/user");
const Organization = require("../model/organization");

const SubUser = sequelize.define(
  "SubUser",
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
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 50], 
      },
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    }, 
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    }, 
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    }, 
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [4, 100],
      }
    }, 
    subUserImage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "https://inventorymanagementdev.s3.us-east-1.amazonaws.com/defaultProfileImage.jpg",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 15],
      }
    },  
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'SalesPerson',
      validate: {
        isIn: [['Manager', 'SalesPerson']], // Updated here
      },
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    otp_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "SubUser",
    timestamps: true,
  }
);

// // Sync only the Sub User model
// SubUser.sync({ force: true })
//   .then(() => {
//     console.log('Sub user table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the sub user model:', error);
//   });

// SubUser.sync({ alter: true })
//   .then(() => {
//     console.log('Sub sub user table has been altered.');
//   })
//   .catch((error) => {
//     console.error('Error syncing the subuser model:', error);
//   });

module.exports = SubUser;
