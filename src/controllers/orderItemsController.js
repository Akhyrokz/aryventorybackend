const OrderItems= require('../model/orderItems');
const SupplierProduct=require('../model/supplierProduct');
const addOrderItems = async (req, res) => {
    try {
      // Create a new user
      const orderItems = await OrderItems.create(req.body);
      // Respond with the created user
      res.status(201).json(orderItems);
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Failed to create user.' });
    }
  }

  const getOrderItemsByOrderId = async (req, res) => {
    const { id } = req.params; // Extract orderId from the URL
    try {
      // Find all order items by the given orderId
      const orderItems = await OrderItems.findAll({
        where: {
          orderId: id
        }, include: [
          {
            model: SupplierProduct, // Include the SupplierProduct model
            as: 'supplierProduct',  // Make sure this matches the alias defined in your association
          }
        ]
      });
  
      if (orderItems.length === 0) {
        return res.status(404).json({ message: 'No order items found for this order ID' });
      }
      
      // Return the found order items as a response
      res.status(200).json(orderItems);
    } catch (error) {
      console.error('Error fetching order items:', error);
      res.status(500).json({ message: 'Failed to fetch order items', error: error.message });
    }
  }
  const getOrderById = async () =>{
  try {
    const allOrders = await Order.findAll({
      where: {
        orgId:req.params.orgId
      },
      include: [
        {
          model: User,
          as: "supplier",
        },
        {
          model: User,
          as: "shopkeeper",
        },
        {
          model: Org,
          as: "Organization",
        },
      ],
      order: [["orderDate", "DESC"]],
    });
    res.status(200).json(allOrders);
  } catch (error) {
    
  }
}
  module.exports = {addOrderItems,getOrderItemsByOrderId};