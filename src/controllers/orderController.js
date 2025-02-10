const { Op, Sequelize } = require("sequelize");
const Order = require("../model/order");
const User = require("../model/user");
const Org = require("../model/organization");
const OrderItems = require("../model/orderItems");
const { sequelize } = require("../config/config");
const moment = require("moment");
const cron = require("node-cron");
const { Transaction } = require("sequelize");
const PlanTracker = require("../model/plansTracker");
const SupplierProduct = require("../model/supplierProduct");
const SupplierOrganization = require("../model/supplierOrganization");
const getLastInvoiceNumberForOrg = async (supplierId, transaction) => {
  try {
    const lastInvoice = await Order.findOne({
      attributes: ["invoiceNo"],
      where: {
        supplierId,
      },
      order: [["createdAt", "DESC"]], // Sort to get the highest invoice number
      transaction: transaction,
      lock: transaction.LOCK.UPDATE, // Lock the row
    });
    if (lastInvoice) {
      const numericPart = lastInvoice.invoiceNo.match(/\d+/); // Extract the numeric part
      return numericPart ? parseInt(numericPart[0], 10) : 0; // Return the numeric part or 0 if none found
    } else {
      return 0;
    }
  } catch (error) {
    console.error("Error fetching last invoice for org:", error.message); // Log the specific error
    throw error; // Re-throw the error to handle it in the calling method
  }
};
const makeOrder = async (req, res) => {
  const {
    shopkeeperId,
    supplierId,
    orgId,
    totalAmt,
    address,
    orderItems,
    userType,
    subUserId,
  } = req.body;

  try {
    // Transaction to create the order and update planstracker
    const createOrder = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const lastInvoiceNo = await getLastInvoiceNumberForOrg(supplierId, t);
        const newInvoiceNumber = lastInvoiceNo ? lastInvoiceNo + 1 : 1;
        let invoiceNo = `INV${String(newInvoiceNumber).padStart(3, "0")}`;
        // Step 1: Create an Order
        const newOrder = await Order.create(
          {
            shopkeeperId,
            supplierId,
            orgId,
            totalAmt,
            address,
            subUserId,
            userType,
            orderDate: new Date(),
            orderedApprovedStatus: "Pending",
            invoiceNo,
          },
          { transaction: t }
        );

        if (!newOrder) {
          throw new Error("Failed to create order.");
        }

        // Step 2: Add  orderItems for the order
        const itemsToCreate = orderItems.map((item) => ({
          orderId: newOrder.id, // Associate with the created order
          supplierProductId: item.supplierProductId,
          quantity: item.quantity,
          productPrice: Number(item.productPrice),
        }));

        // Creating bulk entries.
        const createOrderItems = await OrderItems.bulkCreate(itemsToCreate, {
          transaction: t,
        });

        // Updating the PlanTracker.
        const planTrackerUpdate = await PlanTracker.increment(
          ["countOrdersPerMonth", "countApiCalls"],
          {
            by: 1,
            where: { shopkeeperId, orgId },
            transaction: t,
          }
        );

        if (!planTrackerUpdate) {
          throw new Error("Failed to update PlanTracker.");
        }

        return { newOrder, createOrderItems };
      }
    );

    // Step 3: Return the created Order and associated OrderItems
    return res.status(201).json({
      message: "Order created successfully!",
      order: createOrder.newOrder,
      orderItems: createOrder.createOrderItems,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

const orderDetails = async (req, res) => {
  try {
    console.log(req.query);
    const {
      orderDate,
      orderMonth,
      orderYear,
      supplierDeliveryStatus,
      shopkeeperDeliveryStatus,
      maxAmt,
      minAmt,
      id,
      orgId,
      supplierSearchQuery,
      shopOwnerSearchQuery,
    } = req.query;
    let whereConditions = {
      orderedApprovedStatus: "Approved",
    };

    if (orgId !== undefined && orgId !== null) {
      whereConditions.orgId = orgId;
    } else {
      whereConditions.supplierId = id;
    }

    if (orderDate) {
      const trimmedOrderDate = orderDate.trim(); // Remove any leading or trailing spaces
      whereConditions.orderDate = {
        [Op.gte]: new Date(`${trimmedOrderDate}T00:00:00.000Z`), // Start of the date
        [Op.lt]: new Date(`${trimmedOrderDate}T23:59:59.999Z`), // End of the date
      };
    }

    if (orderMonth) {
      // Split orderMonth into year and month parts
      const [orderYear, orderMonthValue] = orderMonth.split("-");
      whereConditions[Op.and] = [
        sequelize.where(
          sequelize.literal(`EXTRACT(YEAR FROM "Order"."orderDate")`),
          orderYear
        ),
        sequelize.where(
          sequelize.literal(`EXTRACT(MONTH FROM "Order"."orderDate")`),
          orderMonthValue
        ),
      ];
    }

    if (orderYear) {
      whereConditions[Op.and] = sequelize.where(
        sequelize.literal(`EXTRACT(YEAR FROM "Order"."orderDate")`),
        orderYear
      );
    }

    // Add deliveryStatus filter if provided
    if (supplierDeliveryStatus == "Pending") {
      whereConditions.supplierDeliveryStatus = false;
    }
    if (supplierDeliveryStatus == "Delivered") {
      whereConditions.supplierDeliveryStatus = true;
    }
    // if (supplierDeliveryStatus) {
    //   whereConditions.supplierDeliveryStatus = supplierDeliveryStatus;
    // }

    if (shopkeeperDeliveryStatus == "Pending") {
      whereConditions.shopKeeperDeliveryStatus = false;
    }

    if (shopkeeperDeliveryStatus == "Delivered") {
      whereConditions.shopKeeperDeliveryStatus = true;
    }

    if (minAmt && maxAmt) {
      whereConditions.totalAmt = {
        [Op.between]: [parseFloat(minAmt), parseFloat(maxAmt)],
      };
    }
    let supplierWhereClause = {};
    if (supplierSearchQuery) {
      supplierWhereClause.fullName = {
        [Op.iLike]: `%${supplierSearchQuery.toLowerCase()}%`,
      };
    }

    if (Object.keys(supplierWhereClause).length === 0) {
      supplierWhereClause = null;
    }
    let shopOwnerWhereClause = {};
    if (shopOwnerSearchQuery) {
      shopOwnerWhereClause.fullName = {
        [Op.iLike]: `%${shopOwnerSearchQuery.toLowerCase()}%`,
      };
    }

    if (Object.keys(shopOwnerWhereClause).length === 0) {
      shopOwnerWhereClause = null;
    }

    const allOrders = await Order.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "supplier",
          where: supplierWhereClause,
        },
        {
          model: User,
          as: "shopkeeper",
          where: shopOwnerWhereClause,
        },
        {
          model: Org,
          as: "Organization",
        },
      ],
      order: [["orderDate", "DESC"]],
    });

    res.json(allOrders);
  } catch (err) {
    console.error("Error retrieving Orders:", err.message);
    res.status(500).json({ message: "Failed to retrieve Orders." });
  }
};

const updateSupplierDelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the order by ID and update supplierDeliveryStatus to true (1)
    const [updated] = await Order.update(
      {
        supplierDeliveryStatus: true,
        deliveredDate: new Date(),
      }, // Set the new value
      { where: { id: id } } // Specify which record to update
    );
    if (updated) {
      res
        .status(200)
        .json({ message: "Supplier delivery status updated to true." });
    } else {
      res.status(404).json({ message: `Order with id ${id} not found.` });
    }
  } catch (err) {
    console.error("Error updating supplierDeliveryStatus:", err);
    res
      .status(500)
      .json({ message: "Failed to update supplierDeliveryStatus." });
  }
};

const setDeliveryDate = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the order by its ID
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Set the current date and time as deliveredDate
    order.deliveredDate = new Date();

    // Save the changes to the database
    await order.save();
    res.status(200).json({ message: "Order delivered", order });
  } catch (err) {
    console.error("Error updating deliveredDate:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateOrderApprovedStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const [updated] = await Order.update(
      {
        orderedApprovedStatus: status,
        orderApprovedDate: new Date(),
      }, // Set the new value based on the input
      { where: { id: orderId } } // Specify which record to update by id
    );

    // Check if the update affected any rows
    if (updated === 1) {
      const message = status
        ? "Order Request Accepted"
        : "Order Request Rejected";
      res.status(200).json({ message });
    } else {
      res.status(404).json({ message: `Order with id ${orderId} not found.` });
    }
  } catch (err) {
    console.error("Error updating orderedApprovedStatus:", err);
    res
      .status(500)
      .json({ message: "Failed to update orderedApprovedStatus." });
  }
};

const getOrderRequestDetails = async (req, res) => {
  const {
    id,
    orgId,
    orderedApprovedStatus,
    orderDate,
    orderMonth,
    orderYear,
    notPending,
    supplierSearchQuery,
    shopOwnerSearchQuery,
  } = req.query;

  let whereConditions = {};
  if (id) {
    whereConditions.supplierId = id;
  } else if (orgId) {
    whereConditions.orgId = orgId;
  }

  if (orderedApprovedStatus == "Pending") {
    whereConditions.orderedApprovedStatus = "Pending";
  } else if (orderedApprovedStatus == "Approved") {
    whereConditions.orderedApprovedStatus = "Approved";
  } else if (orderedApprovedStatus == "Rejected") {
    whereConditions.orderedApprovedStatus = "Rejected";
  } else if (orderedApprovedStatus == "Expired") {
    whereConditions.orderedApprovedStatus = "Expired";
  }

  if (!orderedApprovedStatus && notPending) {
    whereConditions.orderedApprovedStatus = {
      [Op.ne]: "Pending",
    };
  }

  if (orderDate) {
    if (orderDate) {
      const trimmedOrderDate = orderDate.trim(); // Remove any leading or trailing spaces
      whereConditions.orderDate = {
        [Op.gte]: new Date(`${trimmedOrderDate}T00:00:00.000Z`), // Start of the date
        [Op.lt]: new Date(`${trimmedOrderDate}T23:59:59.999Z`), // End of the date
      };
    }
  }

  if (orderMonth) {
    console.log(orderMonth);
    const [orderYear, orderMonthValue] = orderMonth.split("-");
    whereConditions[Op.and] = [
      sequelize.where(
        sequelize.literal(`EXTRACT(YEAR FROM "Order"."orderDate")`),
        orderYear
      ),
      sequelize.where(
        sequelize.literal(`EXTRACT(MONTH FROM "Order"."orderDate")`),
        orderMonthValue
      ),
    ];
  }

  if (orderYear) {
    console.log(orderYear);
    whereConditions[Op.and] = sequelize.where(
      sequelize.literal(`EXTRACT(YEAR FROM "Order"."orderDate")`),
      orderYear
    );
  }
  let supplierWhereClause = {};
  if (supplierSearchQuery) {
    supplierWhereClause.fullName = {
      [Op.iLike]: `%${supplierSearchQuery.toLowerCase()}%`,
    };
  }

  if (Object.keys(supplierWhereClause).length === 0) {
    supplierWhereClause = null;
  }
  let shopOwnerWhereClause = {};
  if (shopOwnerSearchQuery) {
    shopOwnerWhereClause.fullName = {
      [Op.iLike]: `%${shopOwnerSearchQuery.toLowerCase()}%`,
    };
  }

  if (Object.keys(shopOwnerWhereClause).length === 0) {
    shopOwnerWhereClause = null;
  }
  try {
    const orders = await Order.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "supplier",
          where: supplierWhereClause,
          include: [
            {
              model: SupplierOrganization, 
              as: "supplierOrg", 
            },
          ],
        },
        {
          model: User,
          as: "shopkeeper",
          where: shopOwnerWhereClause,
        },
        {
          model: Org, // Include the Org model for organization details
          as: "Organization", // Ensure this matches your defined association alias for Organization
        },
        {
          model: OrderItems, // Include the Org model for organization details
          as: "orderItems", // Ensure this matches your defined association alias for Organization
        },
      ],
      order: [["orderDate", "DESC"]],
    });

    if (orders.length === 0) {
      return res.status(404).json({
        message: "No order request found",
      });
    }

    // Map through orders and calculate totalQuantity
    const ordersWithTotalQuantity = orders.map((order) => {
      const totalQuantity = order.orderItems.reduce(
        (total, item) => total + item.quantity,
        0
      );
      return {
        ...order.toJSON(),
        totalQuantity, // Add totalQuantity to each order
      };
    });
    res.status(200).json(ordersWithTotalQuantity);
  } catch (err) {
    console.error("Error fetching order requests:", err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the order requests" });
  }
};

const cancelOrder = async () => {
  try {
    const now = moment();
    // Find all orders where orderDate is older than 24 hours
    const ordersToCancel = await Order.findAll({
      where: {
        orderedApprovedStatus: "Pending", // Assuming the status is 'pending' for orders that are not yet canceled
        orderDate: {
          [Sequelize.Op.lte]: now.subtract(24, "hours").toDate(), // 24 hours ago
        },
      },
    });
    // Iterate over the orders and update their status to 'canceled'
    for (const order of ordersToCancel) {
      await order.update({
        orderedApprovedStatus: "Expired",
        orderApprovedDate: new Date(),
      });
      console.log(`Order ${order.id} has been canceled.`);
    }
  } catch (error) {
    console.error("Error canceling orders:", error);
  }
};

// Function to reset plan tracker order count to 0 every month.
const resetOrderCounts = async () => {
  try {
    const [resetCount] = await PlanTracker.update(
      { countOrdersPerMonth: 0 },
      { where: {} }
    );
    if (resetCount > 0) {
      console.log(`Successfully reset ${resetCount} rows in PlanTracker.`);
    } else {
      console.log("No rows were updated in PlanTracker.");
    }
  } catch (error) {
    console.log("Error > orderController > resetOrderCounts:", error.message);
  }
};

const getOrderById = async (req, res) => {
  try {
    const allOrders = await Order.findOne({
      where: {
        id: req.params.orderId,
      },
      include: [
        {
          model: User,
          as: "supplier",
          attributes: [
            "id", 
            "fullName",
            "email",
            "phone",
            "country",
            "city",
            "address",
            "state",
            "pincode",
          ],
          include: [
            {
              model: SupplierOrganization, 
              as: "supplierOrg",
              attributes:[
                "id",
                "orgName",
                "orgPhone",
                "orgEmail",
                "orgGST",
                "address",
                "state",
                "country",
                "pincode",
                "orgLogo",
                "orgSignStamp"
              ]
            },
          ],
        },
        {
          model: User,
          as: "shopkeeper",
          attributes: [
            "id", 
            "fullName",
            "email",
            "phone",
            "country",
            "city",
            "address",
            "state",
            "pincode",
          ],
        },
        {
          model: OrderItems,
          as: "orderItems",
          include: [
            {
              model: SupplierProduct,
              as: "supplierProduct",
            },
          ],
        },
        {
          model: Org,
          as: "Organization",
          attributes:[
            "id",
            "orgName",
            "orgPhone",
            "orgEmail",
            "orgGST",
            "address",
            "state",
            "country",
            "pincode",
            "orgLogo",
            "orgSignStamp"
          ]
        },
      ],
      order: [["orderDate", "DESC"]],
    });
    res.status(200).json(allOrders);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json("server error");
  }
};

const updateOrderForBill = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { CGST, SGST, discount, orderItem ,finalAmt} = req.body;
    
    const updateOrder = await Order.update(
      {
        CGST: Number(CGST),
        SGST: Number(SGST),
        discount: Number(discount),
        finalAmt:Number(finalAmt),
        invoiceDate:new Date()
      },
      { where: { id: orderId } }
    );
    for (const item of orderItem) {
      await OrderItems.update(
        {
          quantity: Number(item.quantity),
          productPrice: Number(item.productPrice),
        },
        {
          where: { id: item.id },
        }
      );
    }
    res.status(200).json("donee");
  } catch (error) {
    console.log(error.message);
    return res.status(500).json("server error");
  }
};
// Cron job to check for orders to cancel every night at 12:00 AM
cron.schedule("0 0 * * *", cancelOrder);
cron.schedule("0 0 1 * *", resetOrderCounts);

module.exports = {
  makeOrder,
  orderDetails,
  updateSupplierDelStatus,
  setDeliveryDate,
  getOrderRequestDetails,
  updateOrderApprovedStatus,
  getOrderById,
  updateOrderForBill,
};
