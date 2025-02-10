const { Model } = require("sequelize");
const Cart = require("../model/cart");
const SupplierProduct = require("../model/supplierProduct");
const User = require("../model/user");
const SubUser = require("../model/subUser");

// Function to add product to cart
const addToCart = async (req, res) => {
  try {
    const {
      shopkeeperId,
      orgId,
      subUserId,
      userType,
      supplierId,
      supplierProductId,
      quantity,
    } = req.body;

    if (subUserId && userType !== "Manager") {
      return res
        .status(401)
        .json({ message: "Subuser type is not a manager." });
    }

    const product = await SupplierProduct.findByPk(supplierProductId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const productPrice = product.productPrice;
    const itemTotalAmount = quantity * productPrice;

    if (
      !shopkeeperId ||
      !orgId ||
      !userType ||
      !supplierId ||
      !supplierProductId ||
      !quantity ||
      !productPrice ||
      !itemTotalAmount
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingCartItem = await Cart.findOne({
      where: {
        shopkeeperId,
        orgId,
        supplierId,
        supplierProductId,
      },
    });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      existingCartItem.itemTotalAmount =
        existingCartItem.quantity * productPrice;
      existingCartItem.userType = userType;
      //This is to handle if the item is add by shopkeeper and later modified by manager
      //Or if added by the manager and later modified by the shopkeeper
      if (
        (subUserId) || (existingCartItem.subUserId)
      ) {
        existingCartItem.subUserId = subUserId;
      }
      await existingCartItem.save();

      return res.status(200).json({
        message: "Cart item quantity update successfully",
        cartItem: existingCartItem,
      });
    } else {
      const newCartItem = await Cart.create({
        shopkeeperId,
        orgId,
        subUserId: subUserId || null,
        userType: userType,
        supplierId,
        supplierProductId,
        quantity,
        productPrice: productPrice,
        itemTotalAmount: itemTotalAmount,
      });

      return res.status(201).json({
        message: "Added item successfully to the cart",
        cartItem: newCartItem,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
};

const updateCartItemQuantity = async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const { operation, quantity } = req.body;

    if (
      !operation ||
      (operation !== "increment" && operation !== "decrement" && operation !== "directUpdate")
    ) {
      return res
        .status(400)
        .json({ error: "Invalid operation. Use 'increment', 'decrement' or 'directUpdate' operation." });
    }

    const cartItem = await Cart.findByPk(cartItemId);
    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (operation === "increment") {
      cartItem.quantity += quantity;
    } else if (operation === "decrement") {
      cartItem.quantity -= quantity;

      if (cartItem.quantity <= 0) {
        await cartItem.destroy();
        return res
          .status(204)
          .json({ message: "Cart item removed successfully." });
      }
    } else if(operation === "directUpdate"){
      cartItem.quantity = quantity;
      
      if(cartItem.quantity <= 0){
        await cartItem.destroy();
        return res.status(204).json({message: "Cart item removed successfully."})
      }
    }

    cartItemUpdatedAmount = cartItem.productPrice * cartItem.quantity;
    cartItem.itemTotalAmount = cartItemUpdatedAmount;

    await cartItem.save();

    return res.status(200).json({
      message: "Updated the quantity of item",
      cartItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update the cart item quantity",
      error: error.message,
    });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;

    const cartItem = Cart.findByPk(cartItemId);
    if (!cartItem) {
      res.status(404).json({ error: "Cart item not found" });
    }

    await Cart.destroy({
      where: { id: cartItemId },
    });

    return res.status(200).json({
      message: "Cart item deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Item not deleted",
      error: error.message,
    });
  }
};

//This function gives all cart items in grouped with supplier
const getAllCartItem = async (req, res) => {
  try {
    const { shopkeeperId, orgId } = req.params;
    const cartItems = await Cart.findAll({
      where: {
        shopkeeperId: shopkeeperId,
        orgId: orgId,
      },
      include: [
        {
          model: SupplierProduct,
          as: "supplierProduct",
        },
        {
          model: User,
          as: "supplier",
        },
      ],
    });

    if (cartItems.length === 0) {
      return res
        .status(200)
        .json({ message: "No cart items found", cartItems: [] });
    }

    const groupCartItems = cartItems.reduce((grouped, item) => {
      const supplierId = item.supplier.id;
      const supplierName = item.supplier.fullName;
      const supplierEmail = item.supplier.email;
      const supplierPhone = item.supplier.phone;
      const supplierCountry = item.supplier.country;
      const supplierCity = item.supplier.city;
      const supplierImage = item.supplier.image;

      if (!grouped[supplierId]) {
        grouped[supplierId] = {
          supplierId,
          supplierName,
          supplierEmail,
          supplierPhone,
          supplierCountry,
          supplierCity,
          supplierImage,
          items: [],
        };
      }

      grouped[supplierId].items.push({
        cartItemId: item.id,
        supplierProductId: item.supplierProduct.id,
        productName: item.supplierProduct.productName,
        quantity: item.quantity,
        productPrice: item.productPrice,
        itemTotalAmount: item.itemTotalAmount,
        coverImage: item.supplierProduct.coverImage,
      });

      return grouped;
    }, {});

    const groupedCartItemsArray = Object.values(groupCartItems);

    return res.status(200).json({
      message: "Fetched all the cart items successfully",
      cartItems: groupedCartItemsArray,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch the cart items",
      error: error.message,
    });
  }
};

// This function give all the cart items belonging to a shopkeeper and his organization
const getCartItem = async (req, res)  => {
 try {
  const { shopkeeperId, orgId } = req.params;
  const cartItems = await Cart.findAll({
    where: {
      shopkeeperId: shopkeeperId,
      orgId: orgId,
    },
  });

  if (cartItems.length === 0) {
    return res
      .status(200)
      .json({ message: "No cart items found.", cartItems: [] });
  }else {
    return res.status(200).json({message: "Cart items found.", cartItems})
  }
 } catch (error) {
  return res.status(500).json({message: "Error fetching the cart items.", error: error})
 }

}

// This is a post request but it does delete operation 
const deleteAllCartItem = async (req, res) => {
  const { ids } = req.body;
  if(!Array.isArray(ids) || ids.length === 0){
    return res.status(400).json({
      message: "Please provide the ids in array format."
    })
  }
  try {
    await Cart.destroy({
      where: {
        id: ids
      }
    })
    return res.status(200).json({
      message: "All cart items deleted successfully."
    })
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: "Unable to delete all cart items."
    })
  }
}

module.exports = {
  addToCart,
  updateCartItemQuantity,
  deleteCartItem,
  getAllCartItem,
  getCartItem, 
  deleteAllCartItem
};
