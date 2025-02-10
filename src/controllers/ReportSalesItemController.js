const { Op } = require("sequelize");
const moment = require("moment");
const CustomerBill = require("../model/CustomerBill");
const { sequelize } = require("../config/config");
const Inventory = require("../model/inventory");
const { Transaction } = require("sequelize");
const PlanTracker = require("../model/plansTracker");
const Plan = require("../model/Plan");
const User = require("../model/user");
const cron = require("node-cron");

const getProductByInvoice = async (req, res) => {
  try {
    const { orgId, dateFilter, startDate, endDate, searchByproductName } =
      req.query;
    if (!orgId) {
      return res.status(400).json({ message: "orgId is required." });
    }

    const orgIdNumber = Number(orgId);
    if (isNaN(orgIdNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid orgId. It must be a number." });
    }

    const whereClause = { orgId: orgIdNumber };

    if (startDate && endDate) {
      const start = moment(startDate, "YYYY-MM-DD");
      const end = moment(endDate, "YYYY-MM-DD");

      if (!start.isValid() || !end.isValid()) {
        return res.status(400).json({
          message:
            "Invalid date range. Please provide valid start and end dates in YYYY-MM-DD format.",
        });
      }

      // Update the whereClause to include the date range
      whereClause.invoiceDate = {
        [Op.gte]: start.toDate(),
        [Op.lte]: end.endOf("day").toDate(),
      };
    }
    // Search by product name
    if (searchByproductName && searchByproductName.trim() !== "") {
      whereClause.productName = {
        [Op.iLike]: `%${searchByproductName.trim()}%`,
      };
    } else if (searchByproductName) {
      console.warn("Empty searchByproductName received, ignoring filter.");
    }

    // Using Transaction to get data and updating the plantracker
    const customerBills = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const customerBillsList = await CustomerBill.findAll({
          where: whereClause,
          attributes: [
            "invoiceNo",
            "estimatedInvoice",
            "productName",
            "isValidBill",
            "id",
            [sequelize.fn("MAX", sequelize.col("invoiceDate")), "invoiceDate"],
          ],
          group: [
            "invoiceNo",
            "estimatedInvoice",
            "productName",
            "isValidBill",
            "id",
          ],
          order: [[sequelize.col("invoiceDate"), "DESC"]],
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

    if (!customerBills || customerBills.length === 0) {
      return res.status(200).json([]);
    }

    const invoiceMap = {};
    customerBills.forEach((bill) => {
      const {
        invoiceNo,
        estimatedInvoice,
        productName,
        isValidBill,
        invoiceDate,
        id,
      } = bill.dataValues;
      const monthYear = moment(invoiceDate).format("MMMM YYYY");
      const year = moment(invoiceDate).format("YYYY");
      const invoiceKey = `${invoiceNo || estimatedInvoice}_${monthYear}`;

      if (!invoiceMap[invoiceKey]) {
        invoiceMap[invoiceKey] = {
          monthYear,
          year,
          invoiceNo: invoiceNo || estimatedInvoice,
          estimatedInvoice,
          products: [],
          invoiceDate,
        };
      }

      if (productName) {
        invoiceMap[invoiceKey].products.push({
          name: productName,
          id,
          isValidBill: isValidBill,
        });
      } else {
        console.warn("Product name is missing for invoice:", invoiceKey);
      }
    });

    const results = Object.values(invoiceMap);
    let finalResults;
    if (dateFilter === "monthlyFilter") {
      finalResults = results.reduce((acc, curr) => {
        const monthGroup = acc[curr.monthYear] || {
          monthYear: curr.monthYear,
          invoices: [],
        };
        monthGroup.invoices.push({
          invoiceNo: curr.invoiceNo,
          estimatedInvoice: curr.estimatedInvoice,
          products: curr.products,
          invoiceDate: curr.invoiceDate,
        });
        acc[curr.monthYear] = monthGroup;
        return acc;
      }, {});
      finalResults = Object.values(finalResults);
    } else {
      finalResults = results;
    }

    res.status(200).json(finalResults);
  } catch (error) {
    console.error("Error fetching product names:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
const getProductDetails = async (req, res) => {
  const { productName, id } = req.params;

  if (!productName || !id) {
    console.error("Invalid parameters:", { productName, id });
    return res.status(400).json({
      status: false,
      message: "Product name and ID are required.",
    });
  }
  try {
    // Query the database
    const customerBills = await CustomerBill.findAll({
      where: {
        productName: { [Op.iLike]: productName },
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
    // Handle the case where no matching records are found
    if (!customerBills || customerBills.length === 0) {
      console.warn("No matching product found.");
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
        };
      } else {
        aggregatedResults[key].quantity += bill.quantity;
      }
    });
    const result = Object.values(aggregatedResults);
    // Send the response
    return res.status(200).json({
      status: true,
      product: result,
    });
  } catch (error) {
    // Log any unexpected errors
    console.error("Error in getProductDetails:", error.message, error.stack);
    return res.status(500).json({
      status: false,
      message: "Error fetching product details.",
    });
  }
};
const getProductListByDateFilter = async (req, res) => {
  try {
    let { orgId } = req.params;
    let { startDate, endDate, dateFormat, employeeId, employeeType } =
      req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required." });
    }

    const start = moment(new Date(startDate));
    const end = moment(new Date(endDate));

    // Where condition for sales by item.
    let whereClause = {
      orgId: orgId,
      invoiceDate: {
        [Op.between]: [start, end],
      },
    };

    // Appending conditions for sale by employee.
    if (employeeId) {
      whereClause = {
        ...whereClause,
        [Op.and]: [
          employeeType === "Manager" || employeeType === "SalesPerson"
            ? { subUserId: employeeId }
            : { shopkeeperId: employeeId },
          { userType: employeeType },
        ],
      };
    }

    // Transaction for getting the data and updating plantracker for that organization
    // Updating the countReportsDownloand and countApiCalls
    const products = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        // Getting the products.
        const productsList = await CustomerBill.findAll({
          where: whereClause,
          attributes: ["invoiceDate", "productName", "quantity", "amount"],
          include: {
            model: Inventory,
            as: "inventory",
            attributes: ["productCategory"],
          },
        });

        if (!productsList) {
          throw new Error("Failed to get product list.");
        }

        // Updating the PlanTracker.
        const planTracker = await PlanTracker.findOne({
          where: { orgId },
          transaction: t,
        });

        if (!planTracker) {
          throw new Error(
            "Plan tracker record not found in get product by category."
          );
        }

        await planTracker.increment(["countReportsDownload", "countApiCalls"], {
          by: 1,
          transaction: t,
        });

        return productsList;
      }
    );

    // Date-wise format
    if (dateFormat === "dateWiseFormat") {
      const dateRange = [];
      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        dateRange.push(moment(date).format("DD MMM YYYY"));
      }

      const productData = {};

      products.forEach((product) => {
        const date = moment(product.invoiceDate).format("DD MMM YYYY");
        const name = product.productName || "Unknown Product";
        const category =
          product.inventory?.productCategory || "Unknown Category";

        if (!productData[name]) {
          productData[name] = {
            category,
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
          dateRange.forEach((d) => {
            productData[name][d] = { quantity: 0, amount: 0 };
          });
        }

        productData[name][date].quantity += product.quantity;
        productData[name][date].amount += product.amount;

        // Update final totals
        productData[name].finalTotalQuantity += product.quantity;
        productData[name].finalTotalAmount += product.amount;
      });

      const formattedData = Object.keys(productData).map((productName) => {
        const row = {
          "Product Name": productName,
          Category: productData[productName].category,
          "Final Total Quantity": productData[productName].finalTotalQuantity,
          "Final Total Amount": productData[productName].finalTotalAmount,
        };
        dateRange.forEach((date) => {
          row[`${date}_quantity`] = productData[productName][date].quantity;
          row[`${date}_amount`] = productData[productName][date].amount;
        });
        return row;
      });

      return res.status(200).json({ dates: dateRange, data: formattedData });
    }

    // Weekly format
    if (dateFormat === "weeklyFormat") {
      const weeks = generateWeeksInRange(start, end);
      const productData = {};

      products.forEach((product) => {
        const { invoiceDate, productName, quantity, amount } =
          product.dataValues;
        const date = moment.utc(invoiceDate);
        const category =
          product.inventory?.productCategory || "Unknown Category";
        const week = weeks.find((w) =>
          date.isBetween(moment(w.start).utc(), moment(w.end).utc(), null, "[]")
        );

        if (!week) return;

        const weekLabel = week.label;
        const name = productName || "Unknown Product";

        if (!productData[name]) {
          productData[name] = {
            category,
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
        }

        if (!productData[name][weekLabel]) {
          productData[name][weekLabel] = { quantity: 0, amount: 0 };
        }

        productData[name][weekLabel].quantity += quantity;
        productData[name][weekLabel].amount += amount;

        // Update final totals
        productData[name].finalTotalQuantity += quantity;
        productData[name].finalTotalAmount += amount;
      });

      const weekLabels = weeks.map((w) => w.label);
      const formattedData = Object.keys(productData).map((productName) => {
        const row = {
          "Product Name": productName,
          Category: productData[productName].category,
          "Final Total Quantity": productData[productName].finalTotalQuantity,
          "Final Total Amount": productData[productName].finalTotalAmount,
        };
        weekLabels.forEach((week) => {
          row[`${week}_quantity`] = productData[productName][week]
            ? productData[productName][week].quantity
            : 0;
          row[`${week}_amount`] = productData[productName][week]
            ? productData[productName][week].amount
            : 0;
        });
        return row;
      });

      return res.status(200).json({ weeks: weekLabels, data: formattedData });
    }

    // Monthly format
    if (dateFormat === "montlyFormat") {
      // Generate month labels dynamically between start and end dates
      const monthLabels = [];
      let currentMonth = start.clone();

      while (currentMonth.isSameOrBefore(end, "month")) {
        monthLabels.push(currentMonth.format("MMMM YYYY"));
        currentMonth.add(1, "month"); // Increment by 1 month
      }

      const productData = {};

      products.forEach((product) => {
        const { invoiceDate, productName, quantity, amount } =
          product.dataValues;
        const date = moment(invoiceDate);
        const monthLabel = date.format("MMMM YYYY");
        const name = productName || "Unknown Product";
        const category =
          product.inventory?.productCategory || "Unknown Category";

        if (!productData[name]) {
          productData[name] = {
            category,
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
        }

        if (!productData[name][monthLabel]) {
          productData[name][monthLabel] = { quantity: 0, amount: 0 };
        }

        productData[name][monthLabel].quantity += quantity;
        productData[name][monthLabel].amount += amount;

        // Update final totals
        productData[name].finalTotalQuantity += quantity;
        productData[name].finalTotalAmount += amount;
      });

      const formattedData = Object.keys(productData).map((productName) => {
        const row = {
          "Product Name": productName,
          Category: productData[productName].category,
          "Final Total Quantity": productData[productName].finalTotalQuantity,
          "Final Total Amount": productData[productName].finalTotalAmount,
        };
        monthLabels.forEach((month) => {
          row[`${month}_quantity`] = productData[productName][month]
            ? productData[productName][month].quantity
            : 0;
          row[`${month}_amount`] = productData[productName][month]
            ? productData[productName][month].amount
            : 0;
        });
        return row;
      });

      return res.status(200).json({ months: monthLabels, data: formattedData });
    }
  } catch (error) {
    console.error(
      "Error > ReportSalesItemController > getProductListByDateFiler:",
      error.message
    );
    res.status(500).json({ message: "Internal server error." });
  }
};
// Helper function to generate dynamic weekly ranges
function generateWeeksInRange(start, end) {
  const weeks = [];
  let current = moment(start).startOf("week"); // Start of the week (Sunday)

  while (current.isBefore(end)) {
    const weekStart = current.clone().startOf("day"); // Midnight start
    const weekEnd = current.clone().endOf("week").endOf("day"); // End of the week (Saturday, end of day)

    weeks.push({
      label: `Week ${weeks.length + 1}`,
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
    });

    current.add(1, "week");
  }

  return weeks;
}

const getSalesReportGroupByCategory = async (req, res) => {
  const { orgId } = req.params;
  const { startDate, endDate, format, searchByCategoryName } = req.query;

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const inventoryWhereClause = {
      orgId,
    };

    if (searchByCategoryName && searchByCategoryName.trim() !== "") {
      inventoryWhereClause.productCategory = {
        [Op.iLike]: `%${searchByCategoryName.trim()}%`,
      };
    }

    // Transaction to get data and update the planTracker.
    const result = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const inventoryDetails = await Inventory.findAll({
          where: inventoryWhereClause,
          attributes: ["id", "productCategory"],
          transaction: t,
        });

        const inventoryMap = {};
        inventoryDetails.forEach((item) => {
          inventoryMap[item.id] = item.productCategory || "Unknown Category";
        });

        const filteredInventoryIds = Object.keys(inventoryMap);

        if (filteredInventoryIds.length === 0) {
          return { inventoryDetails: [], bills: [], inventoryMap };
        }

        const bills = await CustomerBill.findAll({
          where: {
            orgId,
            inventoryId: filteredInventoryIds,
            invoiceDate: { [Op.between]: [start, end] },
          },
          attributes: ["inventoryId", "quantity", "amount", "invoiceDate"],
          transaction: t,
        });

        if (!bills || bills.length === 0) {
          return { inventoryDetails, bills: [], inventoryMap };
        }

        // Update PlanTracker only if previous operations succeed
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

        // Return inventoryDetails, bills, and inventoryMap for further use
        return { inventoryDetails, bills, inventoryMap };
      }
    );

    const { inventoryDetails, bills, inventoryMap } = result;

    if (bills.length === 0 || inventoryDetails.length === 0) {
      return res.status(200).json([]);
    }

    const monthlyCategoryTotals = {};
    const categoryTotals = {};

    bills.forEach((bill) => {
      const {
        inventoryId,
        quantity = 0,
        amount = 0,
        invoiceDate,
      } = bill.dataValues;

      // Grouping logic: Monthly or Category-Only
      if (format === "This Year") {
        const monthYear = invoiceDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });

        if (!monthlyCategoryTotals[monthYear]) {
          monthlyCategoryTotals[monthYear] = {};
        }

        if (!monthlyCategoryTotals[monthYear][inventoryId]) {
          monthlyCategoryTotals[monthYear][inventoryId] = {
            quantity: 0,
            amount: 0,
          };
        }

        monthlyCategoryTotals[monthYear][inventoryId].quantity += quantity;
        monthlyCategoryTotals[monthYear][inventoryId].amount += amount;
      } else {
        if (!categoryTotals[inventoryId]) {
          categoryTotals[inventoryId] = { quantity: 0, amount: 0 };
        }

        categoryTotals[inventoryId].quantity += quantity;
        categoryTotals[inventoryId].amount += amount;
      }
    });

    // Build final response in array format
    if (format === "This Year") {
      const groupedByCategoryMonthly = [];

      Object.keys(monthlyCategoryTotals).forEach((monthYear) => {
        const monthData = [];

        Object.keys(monthlyCategoryTotals[monthYear]).forEach((inventoryId) => {
          const category = inventoryMap[inventoryId];
          if (!category) return; // Skip if the inventory ID is not in the filtered map

          let categoryItem = monthData.find(
            (item) => item.category === category
          );
          if (!categoryItem) {
            categoryItem = { category, quantity: 0, amount: 0 };
            monthData.push(categoryItem);
          }

          categoryItem.quantity +=
            monthlyCategoryTotals[monthYear][inventoryId].quantity;
          categoryItem.amount +=
            monthlyCategoryTotals[monthYear][inventoryId].amount;
        });

        if (monthData.length > 0) {
          groupedByCategoryMonthly.push({ monthYear, data: monthData });
        }
      });

      return res.status(200).json(groupedByCategoryMonthly);
    } else {
      const groupedByCategory = {};

      Object.keys(categoryTotals).forEach((inventoryId) => {
        const category = inventoryMap[inventoryId];
        if (!category) return; // Skip if the inventory ID is not in the filtered map

        if (!groupedByCategory[category]) {
          groupedByCategory[category] = { quantity: 0, amount: 0 };
        }

        groupedByCategory[category].quantity +=
          categoryTotals[inventoryId].quantity;
        groupedByCategory[category].amount +=
          categoryTotals[inventoryId].amount;
      });

      const categoryArray = Object.keys(groupedByCategory).map((category) => ({
        category,
        quantity: groupedByCategory[category].quantity,
        amount: groupedByCategory[category].amount,
      }));
      return res.status(200).json(categoryArray);
    }
  } catch (error) {
    console.error(
      "Error > ReportSalesItemController > getSalesReportGroupByCategory:",
      error.message
    );
    return res.status(500).json({
      message: "Error fetching customer bills.",
      error: error.message,
    });
  }
};

// This API gets data for
const getCategoryListByDateFilter = async (req, res) => {
  try {
    let { orgId } = req.params;
    let { startDate, endDate, dateFormat } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required." });
    }

    const start = moment(new Date(startDate));
    const end = moment(new Date(endDate));

    // Transaction to get the product and update the plan tracker
    const products = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const productsList = await CustomerBill.findAll({
          where: {
            orgId: orgId,
            invoiceDate: {
              [Op.between]: [start, end],
            },
          },
          attributes: ["invoiceDate", "productName", "quantity", "amount"],
          include: {
            model: Inventory,
            as: "inventory",
            attributes: ["productCategory"],
          },
        });

        if (!productsList) {
          throw new Error("Failed to get product list.");
        }

        const planTracker = await PlanTracker.findOne({
          where: { orgId },
          transaction: t,
        });

        if (!planTracker) {
          throw new Error(
            "Plan tracker record not found in get product by category."
          );
        }

        await planTracker.increment(["countReportsDownload", "countApiCalls"], {
          by: 1,
          transaction: t,
        });

        return productsList;
      }
    );

    // Formatting the data based on date formal
    if (dateFormat === "dateWiseFormat") {
      const dateRange = [];
      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        dateRange.push(moment(date).format("DD MMM YYYY"));
      }

      const categoryData = {};

      products.forEach((product) => {
        const date = moment(product.invoiceDate).format("DD MMM YYYY");
        const category =
          product.inventory.productCategory || "Unknown Category";

        if (!categoryData[category]) {
          categoryData[category] = {
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
          dateRange.forEach((d) => {
            categoryData[category][d] = { quantity: 0, amount: 0 };
          });
        }

        // Update quantity and amount for specific date
        categoryData[category][date].quantity += product.quantity;
        categoryData[category][date].amount += product.amount;

        // Update final totals
        categoryData[category].finalTotalQuantity += product.quantity;
        categoryData[category].finalTotalAmount += product.amount;
      });

      const formattedData = Object.keys(categoryData).map((categoryName) => {
        const row = {
          "Product Category": categoryName,
          "Final Total Quantity": categoryData[categoryName].finalTotalQuantity,
          "Final Total Amount": categoryData[categoryName].finalTotalAmount,
        };
        dateRange.forEach((date) => {
          row[`${date}_quantity`] = categoryData[categoryName][date].quantity;
          row[`${date}_amount`] = categoryData[categoryName][date].amount;
        });
        return row;
      });

      return res.status(200).json({ dates: dateRange, data: formattedData });
    }

    if (dateFormat === "weeklyFormat") {
      const weeks = generateWeeksInRange(start, end);
      const categoryData = {};

      products.forEach((product) => {
        const { invoiceDate, quantity, amount } = product.dataValues;
        const date = moment.utc(invoiceDate);
        const category =
          product.inventory.productCategory || "Unknown Category";

        const week = weeks.find((w) =>
          date.isBetween(moment(w.start).utc(), moment(w.end).utc(), null, "[]")
        );
        if (!week) return;

        const weekLabel = week.label;

        if (!categoryData[category]) {
          categoryData[category] = {
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
        }

        if (!categoryData[category][weekLabel]) {
          categoryData[category][weekLabel] = { quantity: 0, amount: 0 };
        }

        categoryData[category][weekLabel].quantity += quantity;
        categoryData[category][weekLabel].amount += amount;

        // Update final totals
        categoryData[category].finalTotalQuantity += quantity;
        categoryData[category].finalTotalAmount += amount;
      });

      const weekLabels = weeks.map((w) => w.label);
      const formattedData = Object.keys(categoryData).map((categoryName) => {
        const row = {
          "Product Category": categoryName,
          "Final Total Quantity": categoryData[categoryName].finalTotalQuantity,
          "Final Total Amount": categoryData[categoryName].finalTotalAmount,
        };
        weekLabels.forEach((week) => {
          row[`${week}_quantity`] = categoryData[categoryName][week]
            ? categoryData[categoryName][week].quantity
            : 0;
          row[`${week}_amount`] = categoryData[categoryName][week]
            ? categoryData[categoryName][week].amount
            : 0;
        });
        return row;
      });

      return res.status(200).json({ weeks: weekLabels, data: formattedData });
    }

    if (dateFormat === "montlyFormat") {
      // Generate month labels dynamically between start and end dates
      const monthLabels = [];
      let currentMonth = start.clone();

      while (currentMonth.isSameOrBefore(end, "month")) {
        monthLabels.push(currentMonth.format("MMMM YYYY"));
        currentMonth.add(1, "month"); // Increment by 1 month
      }

      const categoryData = {};

      products.forEach((product) => {
        const { invoiceDate, quantity, amount } = product.dataValues;
        const category =
          product.inventory.productCategory || "Unknown Category";
        const date = moment(invoiceDate);
        const monthLabel = date.format("MMMM YYYY");

        if (!categoryData[category]) {
          categoryData[category] = {
            finalTotalQuantity: 0,
            finalTotalAmount: 0,
          };
        }

        if (!categoryData[category][monthLabel]) {
          categoryData[category][monthLabel] = { quantity: 0, amount: 0 };
        }

        categoryData[category][monthLabel].quantity += quantity;
        categoryData[category][monthLabel].amount += amount;

        // Update final totals
        categoryData[category].finalTotalQuantity += quantity;
        categoryData[category].finalTotalAmount += amount;
      });

      const formattedData = Object.keys(categoryData).map((categoryName) => {
        const row = {
          "Product Category": categoryName,
          "Final Total Quantity": categoryData[categoryName].finalTotalQuantity,
          "Final Total Amount": categoryData[categoryName].finalTotalAmount,
        };
        monthLabels.forEach((month) => {
          row[`${month}_quantity`] = categoryData[categoryName][month]
            ? categoryData[categoryName][month].quantity
            : 0;
          row[`${month}_amount`] = categoryData[categoryName][month]
            ? categoryData[categoryName][month].amount
            : 0;
        });
        return row;
      });

      return res.status(200).json({ months: monthLabels, data: formattedData });
    }
  } catch (error) {
    console.error(
      "Error in getting category list by date filer:",
      error.message
    );
    res.status(500).json({ message: "Internal server error." });
  }
};

const resetViewCounts = async () => {
  try {
    const [resetCount] = await PlanTracker.update(
      { countReportViewsPerDay: 0 },
      { where: {} }
    );
    if (resetCount > 0) {
      console.log(`Successfully reset countReportViewsPerDay: ${resetCount} rows in PlanTracker.`);
    } else {
      console.log("No rows were updated in PlanTracker.");
    }
  } catch (error) {
    console.log("Error > orderController > resetOrderCounts:", error.message);
  }
};

cron.schedule("0 0 * * *", resetViewCounts);

module.exports = {
  getProductByInvoice,
  getProductDetails,
  getProductListByDateFilter,
  getSalesReportGroupByCategory,
  getCategoryListByDateFilter,
};
