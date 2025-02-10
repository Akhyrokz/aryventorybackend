const CustomerBill = require("../model/CustomerBill");
const { Op, where } = require("sequelize");
const Inventory = require("../model/inventory");
const Order = require("../model/order");
const OrderItems = require("../model/orderItems");
const { sequelize } = require("../config/config");
const SupplierProduct = require("../model/supplierProduct");

const getTotalSalesToday = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const { category, brand, color, minAmt, maxAmt, name } = req.query;

  const todayDate = new Date();
  // Formatting date to match the invoiceDate in customer bill table
  const startOfDay = new Date(
    Date.UTC(
      todayDate.getUTCFullYear(),
      todayDate.getUTCMonth(),
      todayDate.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  const endOfDay = new Date(
    Date.UTC(
      todayDate.getUTCFullYear(),
      todayDate.getUTCMonth(),
      todayDate.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  const whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
    invoiceDate: {
      [Op.gte]: startOfDay,
      [Op.lte]: endOfDay,
    },
  };

  if (minAmt || maxAmt) {
    whereConditions.productPrice = {};
    if (minAmt) {
      whereConditions.productPrice[Op.gte] = minAmt;
    }
    if (maxAmt) {
      whereConditions.productPrice[Op.lte] = maxAmt;
    }
  }
  if (name) {
    whereConditions.productName = { [Op.iLike]: `%${name}%` };
  }

  const inventoryWhere = {};
  if (category) {
    const categoryArray = category.split(',');
    inventoryWhere.productCategory = {
      [Op.or]: categoryArray.map(cat => ({
        [Op.iLike]: `%${cat}%`
      }))
    };
  }

  if (brand) {
    const brandArray = brand.split(',');
    inventoryWhere.productBrand = {
      [Op.or]: brandArray.map(brd => ({
        [Op.iLike]: `%${brd}%`
      }))
    };
  }
  if (color) {
    const colorsArray = color.split(",");
    inventoryWhere.productColor = {
      [Op.or]: colorsArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }

  try {
    const data = await CustomerBill.findAll({
      where: whereConditions,
      include: [
        {
          model: Inventory,
          as: "inventory",
          where: inventoryWhere,
          attributes: [
            "productCategory",
            "productBrand",
            "productColor",
            "coverImage",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    // Transforming the data so that it can be displayed in Product Details
    const transformedData = data.map((item) => {
      const { id, inventoryId, ...rest } = item.toJSON();
      return {
        ...rest,
        id: inventoryId,
      };
    });
    const count = Object.values(transformedData).length;
    res.status(200).send({ data: transformedData, count: count });
  } catch (error) {
    console.log("Error fetching total sales today:", error.message); // Log the full error
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const getTotalSalesMonth = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const { category, brand, color, minAmt, maxAmt, name } = req.query;

  const todayDate = new Date();
  // Set the start and end of the current month
  const startOfMonth = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const endOfMonth = new Date(
    Date.UTC(
      todayDate.getUTCFullYear(),
      todayDate.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )
  );

  const whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
    invoiceDate: {
      [Op.gte]: startOfMonth,
      [Op.lte]: endOfMonth,
    },
  };

  if (minAmt || maxAmt) {
    whereConditions.productPrice = {};
    if (minAmt) {
      whereConditions.productPrice[Op.gte] = minAmt;
    }
    if (maxAmt) {
      whereConditions.productPrice[Op.lte] = maxAmt;
    }
  }
  if (name) {
    whereConditions.productName = { [Op.iLike]: `%${name}%` };
  }

  const inventoryWhere = {};
  if (category) {
    const categoryArray = category.split(',');
    inventoryWhere.productCategory = {
      [Op.or]: categoryArray.map(cat => ({
        [Op.iLike]: `%${cat}%`
      }))
    };
  }

  if (brand) {
    const brandArray = brand.split(',');
    inventoryWhere.productBrand = {
      [Op.or]: brandArray.map(brd => ({
        [Op.iLike]: `%${brd}%`
      }))
    };
  }
  if (color) {
    const colorsArray = color.split(",");
    inventoryWhere.productColor = {
      [Op.or]: colorsArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }

  try {
    const data = await CustomerBill.findAll({
      where: whereConditions,
      include: [
        {
          model: Inventory,
          as: "inventory",
          where: inventoryWhere,
          attributes: [
            "productCategory",
            "productBrand",
            "productColor",
            "coverImage",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    // Transforming the data so that it can be displayed in Product Details
    const transformedData = data.map((item) => {
      const { id, inventoryId, ...rest } = item.toJSON();
      return {
        ...rest,
        id: inventoryId,
      };
    });
    const count = Object.values(transformedData).length;
    res.status(200).send({ data: transformedData, count: count });
  } catch (error) {
    console.log("Error fetching total sales for month:", error.message); // Log the full error
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const getLowQuantityProducts = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const { category, brand, color, minAmt, maxAmt, name } = req.query;

  const whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
    lowStockQuantity: {
      [Op.not]: null,
    },
    quantity: {
      [Op.lte]: sequelize.col("lowStockQuantity"),
      [Op.gte]: 1,
    },
  };

  if (category) {
    const categoryArray = category.split(',');
    whereConditions.productCategory = {
      [Op.or]: categoryArray.map(cat => ({
        [Op.iLike]: `%${cat}%`
      }))
    };
  }

  if (brand) {
    const brandArray = brand.split(',');
    whereConditions.productBrand = {
      [Op.or]: brandArray.map(brd => ({
        [Op.iLike]: `%${brd}%`
      }))
    };
  }
  if (color) {
    const colorsArray = color.split(",");
    whereConditions.productColor = {
      [Op.or]: colorsArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }

  if (minAmt || maxAmt) {
    whereConditions.productPrice = {};
    if (minAmt) {
      whereConditions.productPrice[Op.gte] = minAmt;
    }
    if (maxAmt) {
      whereConditions.productPrice[Op.lte] = maxAmt;
    }
  }
  if (name) {
    whereConditions.productName = { [Op.iLike]: `%${name}%` };
  }

  try {
    const data = await Inventory.findAll({
      where: whereConditions,
    });

    const count = Object.values(data).length;
    res.status(200).send({ data: data, count: count });
  } catch (error) {
    console.log("Error fetching low quantity product:", error.message);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const getTopSellingProducts = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const { category, brand, color, minAmt, maxAmt, name } = req.query;

  const whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
  };

  if (minAmt || maxAmt) {
    whereConditions.productPrice = {};
    if (minAmt) {
      whereConditions.productPrice[Op.gte] = minAmt;
    }
    if (maxAmt) {
      whereConditions.productPrice[Op.lte] = maxAmt;
    }
  }
  if (name) {
    whereConditions.productName = { [Op.iLike]: `%${name}%` };
  }

  const inventoryWhere = {};
  if (category) {
    const categoryArray = category.split(',');
    inventoryWhere.productCategory = {
      [Op.or]: categoryArray.map(cat => ({
        [Op.iLike]: `%${cat}%`
      }))
    };
  }

  if (brand) {
    const brandArray = brand.split(',');
    inventoryWhere.productBrand = {
      [Op.or]: brandArray.map(brd => ({
        [Op.iLike]: `%${brd}%`
      }))
    };
  }
  if (color) {
    const colorsArray = color.split(",");
    inventoryWhere.productColor = {
      [Op.or]: colorsArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }

  try {
    const data = await CustomerBill.findAll({
      where: whereConditions,
      include: [
        {
          model: Inventory,
          as: "inventory",
          where: inventoryWhere,
          attributes: [
            "productCategory",
            "productBrand",
            "productModel",
            "productDescription",
            "productColor",
            "productPrice",
            "coverImage",
            "HSNCode",
            "BarCode",
            "RamRom",
            "chargePort",
            "batteryCapacity",
            "subCategory",
          ],
        },
      ],
    });

    const groupedData = data.reduce((acc, item) => {
      const {
        shopkeeperId,
        orgId,
        subUserId,
        userType,
        inventoryId,
        productName,
        quantity,
        inventory: {
          productCategory,
          productBrand,
          productModel,
          productDescription,
          productColor,
          productPrice,
          coverImage,
          HSNCode,
          BarCode,
          RamRom,
          chargePort,
          batteryCapacity,
          subCategory,
        },
      } = item;

      if (!acc[inventoryId]) {
        acc[inventoryId] = {
          shopkeeperId,
          orgId,
          subUserId,
          userType,
          id: inventoryId,
          productName,
          productCategory,
          productBrand,
          productModel,
          productDescription,
          productColor,
          productPrice,
          coverImage,
          HSNCode,
          BarCode,
          RamRom,
          chargePort,
          batteryCapacity,
          subCategory,
          totalQuantity: 0,
        };
      }
      acc[inventoryId].totalQuantity += quantity;

      return acc;
    }, {});

    // Converting the object to array
    const groupedArray = Object.values(groupedData);

    // Sorting the array in incresing order
    groupedArray.sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Top 10 selling product based on quantity
    const top10 = groupedArray.slice(0, 10);

    const count = Object.values(top10).length;
    res.status(200).send({ data: top10, count: count });
  } catch (error) {
    console.log("Error fetching top selling products:", error.message);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const getOutOfStockProducts = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const { category, brand, color, minAmt, maxAmt, name } = req.query;

  const whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
    quantity: {
      [Op.eq]: 0,
    },
  };

  if (category) {
    const categoryArray = category.split(',');
    whereConditions.productCategory = {
      [Op.or]: categoryArray.map(cat => ({
        [Op.iLike]: `%${cat}%`
      }))
    };
  }

  if (brand) {
    const brandArray = brand.split(',');
    whereConditions.productBrand = {
      [Op.or]: brandArray.map(brd => ({
        [Op.iLike]: `%${brd}%`
      }))
    };
  }
  if (color) {
    const colorsArray = color.split(",");
    whereConditions.productColor = {
      [Op.or]: colorsArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }

  if (minAmt || maxAmt) {
    whereConditions.productPrice = {};
    if (minAmt) {
      whereConditions.productPrice[Op.gte] = minAmt;
    }
    if (maxAmt) {
      whereConditions.productPrice[Op.lte] = maxAmt;
    }
  }
  if (name) {
    whereConditions.productName = { [Op.iLike]: `%${name}%` };
  }

  try {
    const data = await Inventory.findAll({
      where: whereConditions,
    });
    const count = Object.values(data).length;
    res.status(200).send({ data: data, count: count });
  } catch (error) {
    console.log("Error fetching out of stock products:", error.message);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const findUserWithHighestRevenue = (data) => {
  const salesByUser = {};
  data.forEach((item) => {
    const { orgId, subUserId, userType, quantity, productPrice, invoiceNo, finalTotal } = item;

    if (userType === "Shopkeeper") return;

    const userId = subUserId;
    if (!salesByUser[userId]) {
      salesByUser[userId] = { userId, orgId, userType, totalSales: 0, unitSold: 0, mostExpensiveProduct: 0, invoiceNoArray: [] };
    }

    if (!salesByUser[userId].invoiceNoArray.includes(invoiceNo)) {
      salesByUser[userId].invoiceNoArray.push(invoiceNo.toString());
      salesByUser[userId].totalSales += parseFloat(finalTotal);
    }

    salesByUser[userId].unitSold += parseInt(quantity);
    salesByUser[userId].mostExpensiveProduct = Math.max(salesByUser[userId].mostExpensiveProduct, productPrice)

  });

  let topPerformer = null;
  for (const user in salesByUser) {
    if (
      !topPerformer ||
      salesByUser[user].totalSales > topPerformer.totalSales
    ) {
      topPerformer = salesByUser[user];
    }
  }

  return topPerformer
    ? {
      userId: topPerformer.userId,
      orgId: topPerformer.orgId,
      userType: topPerformer.userType,
      totalSales: topPerformer.totalSales,
      unitSold: topPerformer.unitSold,
      mostExpensiveProduct: topPerformer.mostExpensiveProduct,
    }
    : null;
};

const getMonthsBestPerformer = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  const currentDate = new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  try {
    const result = await CustomerBill.findAll({
      where: {
        shopkeeperId: shopkeeperId,
        orgId: orgId,
        invoiceDate: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth],
        },
      },
    });

    const topPerformer = findUserWithHighestRevenue(result);
    res.status(200).json(topPerformer);
  } catch (error) {
    console.log("Error fetching the months best performer:", error.message);
    res.status(500).json({
      message: "Internal server error.",
      error: error,
    });
  }
};

const getInventorySummary = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;
  try {
    const inHand = await Inventory.sum("quantity", {
      where: {
        shopkeeperId: shopkeeperId,
        orgId: orgId,
        isDeleted:false,
      },
    });

    const toBeReceived = await OrderItems.sum("quantity", {
      where: {
        orderId: {
          [Op.in]: sequelize.literal(`(
            SELECT id FROM "Order" 
            WHERE "shopkeeperId" = ${shopkeeperId} 
              AND "orgId" = ${orgId} 
              AND "orderedApprovedStatus" = 'Approved' 
              AND "shopKeeperDeliveryStatus" = false
          )`),
        },
      },
    });

    res.status(200).json({
      inHand: inHand || 0,
      toBeReceived: toBeReceived || 0,
    });
  } catch (error) {
    console.log("Error fetching inventory summary:", error.message);
    res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const getProductCountBySupplierId = async (req, res) => {
  try {
    const productList = await SupplierProduct.sum("productQuantity",{
      where: {
        supplierId: req.params.supplierId,
        isDeleted: false,
      }
    });
    const pendingRequest = await Order.findAll({
      where: {
        orderedApprovedStatus: 'Pending',
        supplierId: req.params.supplierId
      }
    });
    const pendingDelivery = await Order.findAll({
      where: {
        supplierDeliveryStatus: false,
        supplierId: req.params.supplierId,
        orderedApprovedStatus :'Approved' 
      }
    });
    return res.status(200).json({ productCount: productList, pendingRequest: pendingRequest.length, pendingDelivery: pendingDelivery.length })

  } catch (error) {
    console.log(error.message)
    res.status(500).json({message:"Internal Server Error"})
  }

};

module.exports = {
  getTotalSalesToday,
  getTotalSalesMonth,
  getLowQuantityProducts,
  getTopSellingProducts,
  getOutOfStockProducts,
  getMonthsBestPerformer,
  getInventorySummary,
  getProductCountBySupplierId
};
