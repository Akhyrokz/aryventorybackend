const Inventory = require("../model/inventory");
const Order = require("../model/order");
const OrderItems = require("../model/orderItems");
const SupplierProduct = require("../model/supplierProduct");
const { sequelize } = require('../config/config');

const addInventoryItem = async (params, item, transaction) => {
  try {
    await Inventory.create({
      shopkeeperId: params.shopkeeperId,
      subUserId: params.subUserId,
      userType: params.userType,
      orgId: params.orgId,
      productCategory: item.supplierProduct.productCategory,
      productBrand: item.supplierProduct.productBrand,
      productModel: item.supplierProduct.productModel,
      productName: item.supplierProduct.productName,
      productDescription: item.supplierProduct.productDescription,
      productColor: item.supplierProduct.productColor,
      productPrice: item.supplierProduct.productPrice,
      quantity: item.quantity,
      coverImage: item.supplierProduct.coverImage,
      HSNCode: item.supplierProduct.HSNCode,
      BarCode: item.supplierProduct.BarCode,
      RamRom: item.supplierProduct.RamRom,
      chargePort: item.supplierProduct.chargePort,
      batteryCapacity: item.supplierProduct.batteryCapacity,
      subCategory: item.supplierProduct.subCategory,
    }, { transaction });
    return `Added new inventory item`;
  } catch (error) {
    console.error(`Error adding inventory item from deliveryStatusController`, error);
  }
}

const updateSupplierProduct = async (productId, quantityToupdate, transaction) => {
  try {
    const product = await SupplierProduct.findByPk(productId, { transaction });
    await product.update(
      { productQuantity: Number(quantityToupdate) },
      { transaction }
    );
    console.log("quanity updated succesfully");
  }
  catch (error) {
    console.error("quanity is not updated 47:DeliveryStatusControlller");
  }
}

const updateShopkeeperDelStatus = async (id, transaction) => {
  try {
    // Find the order by ID and update ShopkeeperDeliveryStatus to true (1)
    const [updated] = await Order.update(
      {
        shopKeeperDeliveryStatus: true,
        receivedDate: new Date()
      }, // Set the new value
      { where: { id: id }, transaction } // Specify which record to update
    );

    if (updated) {
      return { message: 'Shopkeeper delivery status updated to true.' };
    } else {
      return { message: `Order with id ${id} not found.` };
    }
  } catch (err) {
    console.error('Error updating ShopkeeperDeliveryStatus:', err);
    return { message: 'Failed to update supplierDeliveryStatus.' };
  }
}

const addSupplierProductsIntoInventory = async (req, res) => {

  const params = req.body;
  const transaction = await sequelize.transaction();
  try {
    // Find all order items by the given orderId
    const orderItems = await OrderItems.findAll({
      where: {
        orderId: params.id,
      },
      include: [
        {
          model: SupplierProduct,
          as: 'supplierProduct', // Ensure this matches the alias defined in your association
        }
      ],
      transaction,
    });
    // Check if any order items were found
    if (orderItems.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'No order items found for this order ID' });
    }

    // Iterate over each order item to either update existing inventory or create new entries
    for (const item of orderItems) {
      const existingInventoryItem = await Inventory.findOne({
        where: {
          orgId: params.orgId,
          BarCode: item.supplierProduct.BarCode,
          productPrice: item.supplierProduct.productPrice,
          isDeleted: false
        },
        transaction,
      });

      if (existingInventoryItem) {
        // If product exists, update the quantity
        existingInventoryItem.quantity = Number(existingInventoryItem.quantity);
        existingInventoryItem.quantity += Number(item.quantity);
        await existingInventoryItem.save(transaction);

        //decrease the amount from supplier product
        const quantityToUpdate = Number(item.supplierProduct.productQuantity) - Number(item.dataValues.quantity);
        await updateSupplierProduct(item.supplierProduct.id, quantityToUpdate, transaction);
        await updateShopkeeperDelStatus(params.id, transaction);
        console.log(`Updated quantity for product with BarCode ${item.supplierProduct.BarCode}`);
      } else {
        // If product does not exist, create a new inventory item
        const result = await addInventoryItem(params, item.dataValues, transaction);
        //decrease the amount from supplier product
        if (result == `Added new inventory item`) {
          const quantityToUpdate = Number(item.supplierProduct.productQuantity) - Number(item.dataValues.quantity);
          await updateSupplierProduct(item.supplierProduct.id, quantityToUpdate, transaction);
          await updateShopkeeperDelStatus(params.id, transaction);
          console.log(`Added new inventory item for BarCode ${item.supplierProduct.BarCode}`);
        }
      }
    }
    await transaction.commit();
    console.log("Items processed and added to inventory successfully");
    return res.status(200).json({ message: 'Items added to inventory successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error("Error processing order items: 137:DeliveryStatusControlller", error);
    return res.status(500).json({ message: "Failed to process order items", error: error.message });
  }
};

module.exports = { addSupplierProductsIntoInventory, updateShopkeeperDelStatus };
