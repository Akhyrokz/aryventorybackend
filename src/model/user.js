const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/config');
const bcrypt = require('bcrypt');
const Plan = require('./Plan');

const User = sequelize.define('User', {
  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isNumeric: true,
      len: [10, 15],
    },
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true, 
    validate: {
      isNumeric: true,
      len: [5, 10], 
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Shopkeeper',
    validate: {
      isIn: [['Shopkeeper', 'Supplier']],
    },
  },
  image: {
    type: DataTypes.STRING(4000),
    allowNull: true,
    defaultValue: "https://inventorymanagementdev.s3.us-east-1.amazonaws.com/defaultProfileImage.jpg",
  },
  otp: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  otp_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isverified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isProfileCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, 
    validate: {
      notEmpty: true,
      len: [3, 30], 
      is: /^[a-zA-Z0-9_]+$/i, 
    },
  },
  trialStartDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  trialExpiryDate: {
    type: Sequelize.DATE,
    allowNull: true,
  }, 
  is_trial_expired : {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }, 
  current_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Plan,
      key: "id",  
    }, 
    onUpdate: "CASCADE", 
    onDelete: "SET NULL",
  }, 
  subscription_start_date: {
    type: DataTypes.DATE,
    allowNull: true,
  }, 
  subscription_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  plan_status: {
    type: DataTypes.ENUM('active', 'expired', 'inactive', 'pending'), 
    defaultValue: 'active',
  }, 
  plan_upgrade_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_payment_date : {
    type: DataTypes.DATE,
    allowNull: true,
  },
  next_billing_date : {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_plan_renewed : {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }, 
  failed_payment_count : {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isPrivacyPolicyAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isTermsConditionAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  user_status : {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }, 
}, {
  tableName: 'Users',
  timestamps: true,
});

User.prototype.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Sync only the User model
// User.sync({ force: true })
//   .then(() => {
//     console.log('User table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the User model:', error);
//   });

// User.sync({ alter: true })
//   .then(() => {
//     console.log('User table has been updated.');
//   })
//   .catch((error) => {
//     console.error('Error syncing the User model:', error);
//   });

module.exports = User;