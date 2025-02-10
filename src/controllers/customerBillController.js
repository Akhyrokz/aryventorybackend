const CustomerBill = require('../model/CustomerBill'); // Adjust the path as necessary
const uploadFunction = require('../middleware/fileUpload');
const { sequelize } = require('../config/config');
const { Op, fn, col, Sequelize } = require('sequelize');
const Organizations = require('../model/organization');
const Inventory = require('../model/inventory');

// Fetch all customer bills

const getCustomerBills = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { invoiceDate, inventoryId, searchByCustomerName } = req.query;

    const whereClause = {
      orgId: Number(orgId)
    };

    // If inventoryId is provided, add it to the where clause
    if (inventoryId) {
      whereClause.inventoryId = Number(inventoryId);
    }

    // If invoiceDate is provided, compare only the date part (ignoring time)
    if (invoiceDate) {
      whereClause[Op.and] = [
        sequelize.where(fn('DATE', col('invoiceDate')), invoiceDate)
      ];
    }
    if (searchByCustomerName) {
      whereClause.customerName = { [Op.iLike]: `%${searchByCustomerName}%` };
    }
    const bills = await CustomerBill.findAll({
      where: whereClause,
      include: [
        {
          model: Organizations,
          as: 'organization',
          attributes: ['orgName', 'address']
        }
      ]
    });
    if (bills.length === 0) {
      console.log({ message: "No bills found for the given parameters." });
    }
    const response = bills.map(bill => ({
      ...bill.toJSON(),
      orgName: bill.organization.orgName,
      orgAddress: bill.organization.address
    }));
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getCustomerBills:', error.message);
    res.status(500).send({ message: 'Internal server error' });
  }
};

const getLastInvoiceNumberForOrg = async (orgId, transaction) => {
  try {
    const lastInvoice = await CustomerBill.findOne({
      attributes: ['invoiceNo'],
      where: {
        orgId,
        isValidBill: true
      },
      order: [['invoiceNo', 'DESC']], // Sort to get the highest invoice number
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
    console.error('Error fetching last invoice for org:', error.message); // Log the specific error
    throw error; // Re-throw the error to handle it in the calling method
  }
};

const getLastEstimatedInvoiceNumberForOrg = async (orgId, transaction) => {
  try {
    const lastInvoice = await CustomerBill.findOne({
      attributes: ['estimatedInvoice'],
      where: {
        orgId,
        isValidBill: false
      },
      order: [['estimatedInvoice', 'DESC']], // Sort to get the highest invoice number
      transaction: transaction,
      lock: transaction.LOCK.UPDATE, // Lock the row
    });
    // If no invoice found or estimatedInvoice is null, return 0
    if (!lastInvoice || !lastInvoice.estimatedInvoice) {
      return 0;
    }
    if (lastInvoice) {
      const numericPart = lastInvoice.estimatedInvoice.match(/\d+/); // Extract the numeric part
      return numericPart ? parseInt(numericPart[0], 10) : 0; // Return the numeric part or 0 if none found
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Error fetching last estimatedInvoice for org:', error.message); // Log the specific error
    throw error; // Re-throw the error to handle it in the calling method
  }
};

const createCustomerBill = async (req, res) => {
  const transaction = await sequelize.transaction(
    { isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }
  );
  uploadFunction.fields([{ name: 'signatureImage', maxCount: 1 }])(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ message: 'File upload failed.', error: err.message });
    }

    let planData = req.planTracker;

    const signatureImage = req.files['signatureImage'] ? req.files['signatureImage'][0].location : null;
    try {
      let {
        customerName,
        customerPhone,
        customerAddress,
        productTotal,
        discount,
        SGST,
        CGST,
        finalTotal,
        shopkeeperId,
        orgId,
        userType,
        subUserId,
        billType,
        date
      } = req.body;
      console.log(req.body);

      if (!shopkeeperId) {
        console.log("shopKeeper does not exist");
        return;
      }

      let subUser = subUserId == 'null' ? null : Number(subUserId);
      shopkeeperId = shopkeeperId == 'null' ? null : Number(shopkeeperId)
      let selectedProducts = req.body.selectedProducts;

      // If selectedProducts is a string, parse it
      if (typeof selectedProducts === 'string') {
        try {
          selectedProducts = JSON.parse(selectedProducts);  // Parse the stringified array
        } catch (parseError) {
          return res.status(400).json({ message: 'Invalid selectedProducts format' });
        }
      }
      // Ensure selectedProducts is an array
      if (!Array.isArray(selectedProducts)) {
        return res.status(400).json({ message: 'selectedProducts should be an array' });
      }

      // Fetch the last invoice number for this orgId based on the billtype
      let finalInvoiceNo, finalEstimatedInvoice;
      if (billType === 'original') {
        const lastInvoiceNo = await getLastInvoiceNumberForOrg(orgId, transaction);
        const newInvoiceNumber = lastInvoiceNo ? lastInvoiceNo + 1 : 1;
        finalInvoiceNo = `INV${String(newInvoiceNumber).padStart(3, '0')}`;
        finalEstimatedInvoice = null;
      } else if (billType === 'estimated') {
        const lastInvoiceNo = await getLastEstimatedInvoiceNumberForOrg(orgId, transaction);
        const newInvoiceNumber = lastInvoiceNo ? lastInvoiceNo + 1 : 1;
        finalEstimatedInvoice = `INV${String(newInvoiceNumber).padStart(3, '0')}`;
        finalInvoiceNo = null;
      }
      let isValidBill;
      if (billType == 'original') {
        isValidBill = true;
      } else {
        isValidBill = false
      }

      // Create customer bills for each product
      const customerBills = await Promise.all(selectedProducts.map(async (product) => {
        const customerBill = await CustomerBill.create({
          customerName,
          customerPhone,
          customerAddress,
          invoiceNo: finalInvoiceNo,
          estimatedInvoice: finalEstimatedInvoice,
          invoiceDate: date,
          quantity: product.quantity,
          productName: product.productName,
          productModel: product.productModel,
          productPrice: parseFloat(product.productPrice), // Ensure price is a number
          IMEI1: product.IMEI1 || null,
          IMEI2: product.IMEI2 || null,
          amount: parseFloat(product.productPrice) * product.quantity,
          productTotal,
          discount,
          SGST,
          CGST,
          finalTotal,
          signatureImage,
          inventoryId: product.id,
          shopkeeperId,
          orgId,
          userType,
          subUserId: subUser,
          isValidBill: isValidBill,
        }, { transaction });

        await planData.increment(["countBillsCreation", "countApiCalls"], {
          by: 1,
          transaction,
        });

        await decreaseQuantityFromInventory(selectedProducts, transaction);

        return customerBill;
      })
      );
      await transaction.commit(); 
      return res.status(201).json({ message: 'Customer bills created successfully', data: customerBills });
    } catch (error) {
      if (transaction) await transaction.rollback(); // Rollback the transaction in case of an error
      console.error('Error creating customer bill:', error.message);
      return res.status(500).json({ message: 'something went wrong please try Again', error: error.message });
    }
  });
};

const decreaseQuantityFromInventory = async (products, transaction) => {
  const results = [];

  try {
    for (const product of products) {
      const { id, quantity } = product;
      const inventory = await Inventory.findOne({ where: { id } });

      if (!inventory) {
        return res.status(404).json({ message: `Inventory with id ${id} not found` });
      }

      const newQuantity = inventory.quantity - quantity;
      await Inventory.update(
        { quantity: newQuantity },
        { where: { id } },
        transaction
      );
      results.push({ id, newQuantity });
    }
    return { message: "Quantities updated successfully", result: results }
  } catch (error) {
    return { message: 'Error updating quantities : CustomerBillController < decreaseQuantityFromInventory : 258', error: error.message, }
  }
};

const getCustomerBillByInvoice = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { invoiceNo, estimatedInvoice } = req.query;
    const whereClause = {
      orgId: orgId
    };
    if (invoiceNo) {
      whereClause.invoiceNo = invoiceNo;
    }
    if (estimatedInvoice) {
      whereClause.estimatedInvoice = estimatedInvoice;
    }

    console.log(whereClause);
    const bills = await CustomerBill.findAll({
      where: whereClause
    });

    // Transform the response to the desired format
    const formattedResponse = {};

    bills.forEach(bill => {
      const data = bill.dataValues; // Access the dataValues

      const {
        invoiceNo,
        invoiceDate,
        customerName,
        customerPhone,
        customerGst,
        customerAddress,
        productTotal,
        discount,
        SGST,
        CGST,
        finalTotal,
        signatureImage,
        shopkeeperId,
        subUserId,
        orgId,
        userType,
        estimatedInvoice,
        isValidBill
      } = data;

      if (!formattedResponse[invoiceNo || estimatedInvoice]) {
        formattedResponse[invoiceNo || estimatedInvoice] = {
          invoiceNo,
          invoiceDate,
          customerName,
          customerPhone,
          customerGst,
          customerAddress,
          productTotal,
          discount,
          SGST,
          CGST,
          finalTotal,
          signatureImage,
          shopkeeperId,
          subUserId,
          orgId,
          userType,
          estimatedInvoice,
          isValidBill,
          item: []
        };
      }

      formattedResponse[invoiceNo || estimatedInvoice].item.push({
        id: data.id,
        productName: data.productName,
        productModel: data.productModel,
        quantity: data.quantity,
        productPrice: data.productPrice,
        IMEI1: data.IMEI1 || null, // Use null if not available
        IMEI2: data.IMEI2 || null, // Use null if not available
        amount: data.amount,
        inventoryId: data.inventoryId || null // Include inventoryId if present
      });
    });

    res.status(200).json(Object.values(formattedResponse));
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const checkProductSold = async(req,res)=>{
  const {inventoryId} = req.params;
  try {
    const response = CustomerBill.findOne({where : {inventoryId:inventoryId}});
    if (response) {
      return res.json({ exists: true }); 
    } else {
      return res.json({ exists: false }); 
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "Internal Server Error" }); 
  }
}

module.exports = {
  getCustomerBills,
  createCustomerBill,
  getLastInvoiceNumberForOrg,
  getLastEstimatedInvoiceNumberForOrg,
  getCustomerBillByInvoice,
  checkProductSold
};

