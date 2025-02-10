const { sequelize } = require("../config/config");
const { DataTypes } = require("sequelize");
const Organization = require("../model/organization");
const User = require("../model/user");
const SubUser = require("../model/subUser");

const Order = sequelize.define(
  "Order",
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
        // Set supplierId as a foreign key
        model: User, // Reference the User model
        key: "id", // Reference the 'id' field in the User model
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        // Set supplierId as a foreign key
        model: User, // Reference the User model
        key: "id", // Reference the 'id' field in the User model
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        // Set supplierId as a foreign key
        model: Organization, // Reference the User model
        key: "id", // Reference the 'id' field in the User model
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    subUserId: {
      type: DataTypes.BIGINT,
      references: {
        model: SubUser,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalAmt: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    orderedApprovedStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Pending",
      validate: {
        isIn: [["Pending", "Approved", "Rejected", "Expired"]],
      },
    },
    supplierDeliveryStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    shopKeeperDeliveryStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      get() {
        const rawDate = this.getDataValue("orderDate");
        return rawDate
          ? rawDate.toISOString().split("T")[0] +
              " " +
              rawDate.toTimeString().split(" ")[0]
          : null;
      },
    },
    orderApprovedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        const rawDate = this.getDataValue("orderApprovedDate");
        return rawDate
          ? rawDate.toISOString().split("T")[0] +
              " " +
              rawDate.toTimeString().split(" ")[0]
          : null;
      },
    },
    deliveredDate: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        const rawDate = this.getDataValue("deliveredDate");
        return rawDate
          ? rawDate.toISOString().split("T")[0] +
              " " +
              rawDate.toTimeString().split(" ")[0]
          : null;
      },
    },
    receivedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        const rawDate = this.getDataValue("receivedDate");
        return rawDate
          ? rawDate.toISOString().split("T")[0] +
              " " +
              rawDate.toTimeString().split(" ")[0]
          : null;
      },
    },
      CGST: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      SGST: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
    invoiceNo:{
      type: DataTypes.STRING,
      allowNull: true,  
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: true,
  },
  finalAmt: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  },
  {
    tableName: "Order",
    timestamps: true, // Set to true if you want timestamps
  }
);

// // Sync only the User model
// Order.sync({ alter: true })
//   .then(() => {
//     console.log('Order table has been recreated (dropped if existed and recreated).');
//   })
//   .catch((error) => {
//     console.error('Error syncing the Order model:', error);
//   });
module.exports = Order;
