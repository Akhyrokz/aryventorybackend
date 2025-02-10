const { Op } = require("sequelize");
const SubUser = require("../model/subUser");
const User = require("../model/user");
const CustomerBill = require("../model/CustomerBill");
const moment = require("moment");
const Organizations = require("../model/organization");
const Inventory = require("../model/inventory");
const { sequelize } = require("../config/config");
const { Transaction } = require("sequelize");
const PlanTracker = require("../model/plansTracker");
const Order = require("../model/order");

const getSales = async (req, res) => {
  const userId = req.params.userId;
  const soldOnDate = req.query.date;
  const endDate = req.query.endDate;
  const orgId = req.query.organizationId;

  try {
    const whereClause = {
      shopkeeperId: parseInt(userId, 10),
    };

    if (orgId) {
      whereClause.orgId = parseInt(orgId, 10);
    }

    if (soldOnDate) {
      const isValidStartDate = moment(soldOnDate, "YYYY-MM-DD", true).isValid();
      const isValidEndDate = endDate
        ? moment(endDate, "YYYY-MM-DD", true).isValid()
        : true;

      if (isValidStartDate && isValidEndDate) {
        // Define date range based on inputs
        const startOfDay = moment.utc(soldOnDate).startOf("day").toDate();
        const endOfDay = endDate
          ? moment.utc(endDate).endOf("day").toDate()
          : moment.utc(soldOnDate).endOf("day").toDate();

        whereClause.invoiceDate = {
          [Op.between]: [startOfDay, endOfDay],
        };
      } else {
        return res.status(400).json({
          message: "Invalid date format provided.",
        });
      }
    }

    // Fetch sales records from CustomerBill
    const salesRecords = await CustomerBill.findAll({
      where: whereClause,
      attributes: [],
      include: [
        {
          model: SubUser,
          as: "subUser",
          attributes: ["id", "fullName", "phone", "userType", "subUserImage"], // Include id and fullName
        },
        {
          model: User,
          as: "shopkeeper",
          attributes: ["id", "fullName", "phone", "userType", "image"], // Include id and fullName
        },
        {
          model: Organizations,
          as: "organization",
          attributes: ["id"],
        },
      ],
    });

    // Check if any sales records are found
    if (salesRecords.length === 0) {
      return res.status(404).json({
        message: "No sales found for this shopkeeper on the provided date.",
      });
    }

    // Use a Set to track unique employee IDs and names
    const uniqueEmployees = new Set();
    const employeeNames = [];

    // Extract and format employee names along with their IDs
    salesRecords.forEach((record) => {
      const subUser = record.subUser;
      const shopkeeper = record.shopkeeper;

      // Choose either subUser or shopkeeper, depending on which is present
      const employeeId = subUser?.id || shopkeeper?.id;
      const employeeName = subUser?.fullName || shopkeeper?.fullName;
      const phone = subUser?.phone || shopkeeper?.phone;
      const employeeType = subUser?.userType || shopkeeper?.userType;
      const image = subUser?.subUserImage || shopkeeper?.image;

      // Only add to the results if this employee hasn't been added yet
      if (employeeId && !uniqueEmployees.has(employeeId)) {
        uniqueEmployees.add(employeeId);
        employeeNames.push({
          id: employeeId,
          name: employeeName,
          phone: phone,
          userType: employeeType,
          image: image,
        });
      }
    });

    // Return the unique employee names and IDs
    res.status(200).json({ employeeNames });
  } catch (error) {
    console.error("Error fetching sales records:", error.message || error);
    res.status(500).json({
      message: "Error fetching sales records.",
      error: error.message || error,
    });
  }
};

const getEmployeeProducts = async (req, res) => {
  const { employeeId } = req.params;
  const { columns, soldOnDate, orgId } = req.query;
  const searchByproductName = req.query.searchByproductName;

  // Validate employeeId
  if (!employeeId || isNaN(employeeId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid employee ID provided.",
    });
  }

  let soldOnDateCondition = null;
  if (soldOnDate) {
    const date = new Date(soldOnDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        status: false,
        message: "Invalid sold date provided.",
      });
    }
    soldOnDateCondition = date.toISOString().split("T")[0];
  }

  try {
    // Set up the where condition
    const whereCondition = {
      [Op.or]: [
        { shopkeeperId: parseInt(employeeId, 10) },
        { subUserId: parseInt(employeeId, 10) },
      ],
    };
    if (searchByproductName && searchByproductName.trim() !== "") {
      whereCondition.productName = {
        [Op.iLike]: `%${searchByproductName.trim()}%`,
      }; // Add search filter
    }
    // If soldOnDate is provided, add it to the where condition
    if (soldOnDateCondition) {
      whereCondition.invoiceDate = {
        [Op.gte]: new Date(`${soldOnDateCondition}T00:00:00.000Z`), // Start of the day
        [Op.lt]: new Date(`${soldOnDateCondition}T23:59:59.999Z`), // End of the day
      };
    }

    let attributes = [
      "productName",
      "invoiceNo",
      "estimatedInvoice",
      "invoiceDate",
    ];
    if (columns) {
      const requestedColumns = columns.split(",");
      attributes = [...attributes, ...requestedColumns];
    }

    // Transaction for getting the data and udpating the plantracker table.
    const customerBills = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const customerBillsList = await CustomerBill.findAll({
          where: whereCondition,
          include: [
            {
              model: Inventory,
              as: "inventory",
              attributes: [
                "productName",
                "productColor",
                "productCategory",
                "RamRom",
              ], // Ensure productName is fetched if in Inventory
              required: false,
            },
          ],
          attributes: [
            "id",
            "productName", // Ensure productName is fetched directly
            "customerName",
            "customerAddress",
            "customerPhone",
            "quantity",
            "productModel",
            "productPrice",
            "amount",
            "productTotal",
            "discount",
            "finalTotal",
            "invoiceNo",
            "estimatedInvoice",
            "invoiceDate",
            "inventoryId",
            "isValidBill",
            "IMEI1",
            "IMEI2",
          ],
          transaction: t,
        });

        if (!customerBillsList) {
          throw new Error("Unable to find customer bills record.");
        }

        const planTrackerUpdate = await PlanTracker.increment(
          ["countReportViewsPerDay", "countApiCalls"],
          {
            by: 1,
            where: { orgId },
            transaction: t,
          }
        );

        if (!planTrackerUpdate) {
          throw new Error("Failed to update PlanTracker.");
        }

        return customerBillsList;
      }
    );

    if (customerBills.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No products sold by this employee on the specified date.",
      });
    }

    // Map the results to include productName, invoiceNo, and invoiceDate
    const productsSold = customerBills.map((bill) => {
      const productData = {
        id: bill.id,
        productName:
          bill.productName ||
          (bill.inventory ? bill.inventory.productName : null),
        invoiceNo: bill.invoiceNo || "Estimated Invoice No",
        estimatedInvoice: bill.estimatedInvoice || "No Estimated Invoice",
        isValidBill: bill.isValidBill,
        quantity: bill.quantity,
        amount: bill.amount,
      };

      attributes.forEach((attr) => {
        const cleanedAttr = attr.replace(/^"|"$/g, "");
        if (bill[cleanedAttr] !== undefined) {
          productData[cleanedAttr] = bill[cleanedAttr];
        }
      });

      if (bill.inventory) {
        productData.productColor = bill.inventory.productColor;
        productData.RamRom = bill.inventory.RamRom;
        productData.productCategory = bill.inventory.productCategory;
        productData.inventoryQuantity = bill.inventory.quantity;
      }

      productData.icon = bill.isValidBill ? "greenIconPath" : "redIconPath";

      return productData;
    });

    return res.status(200).json({ status: true, products: productsSold });
  } catch (error) {
    console.error(
      "Error > reportsController > getEmployeeProducts",
      error.message
    );
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

const getProductDetailsofEmp = async (req, res) => {
  const { productName, id } = req.params;

  if (!productName || !id) {
    return res.status(400).json({
      status: false,
      message: "Product name and ID are required.",
    });
  }

  try {
    const customerBills = await CustomerBill.findAll({
      where: {
        productName: productName,
        id: id,
      },
      include: {
        model: Inventory,
        as: "inventory",
        attributes: ["RamRom", "productColor", "productCategory", "coverImage"],
      },
      attributes: [
        "customerName",
        "customerAddress",
        "customerPhone",
        "quantity",
        "productName",
        "productModel",
        "productPrice",
        "amount",
        "invoiceNo",
        "inventoryId",
        "IMEI1",
        "IMEI2",
      ],
    });

    // Log raw customer bills
    customerBills.map((bill) => bill.toJSON());

    if (!customerBills || customerBills.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Product not found in customer bill with the given ID.",
      });
    }

    const aggregatedResults = {};
    customerBills.forEach((bill) => {
      const key = `${bill.invoiceNo}-${bill.inventoryId}`;

      if (!aggregatedResults[key]) {
        aggregatedResults[key] = {
          ...bill.dataValues,
          inventory: bill.inventory,
          quantity: bill.quantity,
          invoiceNo: bill.invoiceNo || bill.estimatedInvoiceNo,
        };
      } else {
        aggregatedResults[key].quantity += bill.quantity;
      }
    });

    const result = Object.values(aggregatedResults);

    return res.status(200).json({
      status: true,
      product: result,
    });
  } catch (error) {
    console.error("Error fetching product details:", error.message || error);
    return res.status(500).json({
      status: false,
      message: "Error fetching product details.",
    });
  }
};

const getInventoryDetails = async (req, res) => {
  try {
    // Specify the desired columns from Inventory
    const inventoryColumns = ["productColor", "productCategory", "RamRom"];

    // Specify the desired columns from CustomerBill
    const customerBillColumns = [
      "customerName",
      "customerPhone",
      "customerGst",
      "customerAddress",
      "invoiceNo",
      "productModel",
      "quantity",
      "productPrice",
      "amount",
      "productTotal",
      "finalTotal",
      "productPrice",
      "amount",
      "productTotal",
      "finalTotal",
    ];

    // Merge both sets of columns into one array
    const mergedColumns = [...inventoryColumns, ...customerBillColumns];

    // Send the merged columns as a response
    res.status(200).json({
      success: true,
      columns: mergedColumns,
    });
  } catch (error) {
    console.error("Error fetching column names:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSupplier = async (req, res) => {
  const userId = req.query.userId; // Use req.query instead of req.params
  const soldOnDate = req.query.date;
  const endDate = req.query.endDate;
  const orgId = req.query.organizationId;

  // console.log("Received Parameters:", { userId, soldOnDate, endDate, orgId });

  try {
    // Ensure userId is provided and is a valid integer
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }

    // Ensure orgId is provided and is valid
    if (!orgId || isNaN(orgId)) {
      return res.status(400).json({ message: "Invalid or missing organizationId" });
    }

    // Initialize whereClause with mandatory userId and orgId
    const whereClause = {
      shopkeeperId: parseInt(userId, 10),
      orgId: parseInt(orgId, 10),
    };

    // Include date range if provided and valid
    if (soldOnDate) {
      const isValidStartDate = moment(soldOnDate, "YYYY-MM-DD", true).isValid();
      const isValidEndDate = endDate
        ? moment(endDate, "YYYY-MM-DD", true).isValid()
        : true;

      if (isValidStartDate && isValidEndDate) {
        const startOfDay = moment.utc(soldOnDate).startOf("day").toDate();
        const endOfDay = endDate
          ? moment.utc(endDate).endOf("day").toDate()
          : moment.utc(soldOnDate).endOf("day").toDate();

        whereClause.orderDate = {
          [Op.between]: [startOfDay, endOfDay],
        };
      } else {
        return res.status(400).json({
          message: "Invalid date format provided.",
        });
      }
    }

    // Fetch suppliers with the constructed whereClause
    const suppliers = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "supplier",
          attributes: ["id", "fullName", "email", "phone"],
        },
      ],
      distinct: true, // Ensures no duplicate rows are fetched
    });

    // Extract unique supplier data
    const supplierData = suppliers.map((order) => order.supplier);

    res.status(200).json({ suppliers: supplierData });
  } catch (error) {
    console.error("Error fetching suppliers:", error); // Log the error for debugging
    res.status(500).json({
      message: "Error fetching suppliers",
      error: error.message || "Unknown error",
    });
  }
};


module.exports = {
  getSales,
  getEmployeeProducts,
  getProductDetailsofEmp,
  getInventoryDetails,
  getSupplier
};
