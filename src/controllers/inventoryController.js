const Inventory = require("../model/inventory");
const uploadFunction = require("../middleware/fileUpload");
const SubUser = require("../model/subUser");
const User = require("../model/user");
const Organization = require("../model/organization");
const { Op, Sequelize } = require("sequelize");
const { sequelize } = require("../config/config");
const PlanTracker = require("../model/plansTracker");
const Plan = require("../model/Plan");

// Create a new inventory item
const createInventoryItem = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  uploadFunction.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res
          .status(400)
          .json({ message: "File upload failed.", error: err.message });
      }

      let planData = req.planTracker;

      const {
        ItemName,
        ProductTitle,
        Quantity,
        LowStockQuantity,
        Price,
        Brand,
        ProductDescription,
        Category,
        SubCategory,
        ProductColor,
        HSNCode,
        shopkeeperId,
        BatteryCapacity,
        ChargePort,
        RamRom,
        BarCode,
        SubUserId,
        OrgId,
        UserType,
      } = req.body;

      const parsedPrice = !isNaN(parseFloat(Price)) ? parseFloat(Price) : 0;
      const image = req.files["image"] ? req.files["image"][0].location : null;
      const orgIdValue = OrgId === "null" ? null : OrgId;
      const subUserIdValue = SubUserId === "null" ? null : SubUserId;
      try {
        // Check for duplicate barcode
        if (BarCode) {
          const existingItem = await Inventory.findOne({
            where: { BarCode, orgId: orgIdValue },
            transaction,
          });
          if (existingItem) {
            return res
              .status(409)
              .json({ message: "Item with this barcode already exists." });
          }
        }
        const newItem = await Inventory.create(
          {
            productName: ItemName.trim() || "",
            productDescription: ProductDescription || "",
            productPrice: parsedPrice,
            coverImage: image || "",
            productModel: ProductTitle.trim() || "",
            productCategory: Category.trim() || "",
            subCategory: SubCategory.trim() || "",
            productBrand: Brand.trim() || "",
            productColor: ProductColor.trim() || "",
            quantity: Quantity || "",
            lowStockQuantity: LowStockQuantity || 0,
            HSNCode: HSNCode || "",
            BarCode: BarCode || "",
            RamRom: RamRom || "",
            chargePort: ChargePort.trim() || "",
            batteryCapacity: BatteryCapacity || "",
            subUserId: subUserIdValue || null,
            orgId: orgIdValue,
            userType: UserType || null,
            shopkeeperId: shopkeeperId ? parseInt(shopkeeperId, 10) : null,
          },
          transaction
        );

        const state = transaction.finished;
        if (!state) {
          console.log(`Transaction is running 111111111 ${state}.`);
        }

        await planData.increment(["countProducts", "countApiCalls"], {
          by: 1,
          transaction,
        });

        const state2 = transaction.finished;
        if (!state2) {
          console.log(`Transaction is running 2222222 ${state2}.`);
        }

        await transaction.commit();

        return res.status(201).send({
          message: "Inventory item added successfully",
          item: newItem,
        });
      } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error adding inventory item:", error);
        return res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    }
  );
};

// fetches the inventory as per shopkeeperId
const getAllInventory = async (req, res) => {
  const {
    shopkeeperId,
    orgId,
    category,
    color,
    brand,
    maxAmt,
    minAmt,
    searchQuery,
  } = req.query;
  if (!shopkeeperId || isNaN(shopkeeperId)) {
    return res.status(400).json({ error: "Invalid shopkeeperId" });
  }

  let whereConditions = {
    shopkeeperId: shopkeeperId,
    orgId: orgId,
    isDeleted: false,
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

  if (category) {
    const categoryArray = category.split(",");
    whereConditions.productCategory = {
      [Op.or]: categoryArray.map((cat) => ({
        [Op.iLike]: `%${cat}%`,
      })),
    };
  }

  if (brand) {
    const brandArray = brand.split(",");
    whereConditions.productBrand = {
      [Op.or]: brandArray.map((brd) => ({
        [Op.iLike]: `%${brd}%`,
      })),
    };
  }

  if (color) {
    const colorArray = color.split(",");
    whereConditions.productColor = {
      [Op.or]: colorArray.map((clr) => ({
        [Op.iLike]: `%${clr}%`,
      })),
    };
  }
  if (searchQuery) {
    const lowerQuery = `%${searchQuery.toLowerCase()}%`;
    whereConditions[Op.or] = [
      { productName: { [Op.iLike]: lowerQuery } },
      { productModel: { [Op.iLike]: lowerQuery } },
      { productBrand: { [Op.iLike]: lowerQuery } },
      { productCategory: { [Op.iLike]: lowerQuery } },
      { productColor: { [Op.iLike]: lowerQuery } },
    ];
  }

  try {
    // Fetch data from Inventory with associations
    const inventoryData = await Inventory.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "shopkeeper",
        },
        {
          model: SubUser,
          as: "subUser",
        },
        {
          model: Organization,
          as: "organization",
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    // Return the data
    res.status(200).json(inventoryData);
    console.log(inventoryData);
  } catch (error) {
    console.error("Error fetching inventory data:", error.message);
    res.status(500).json({ message: "Error fetching inventory data" });
  }
};

const fetchByBarcode = async (req, res) => {
  try {
    const data = await Inventory.findOne({
      where: { orgId: req.params.id, BarCode: req.params.barCode },
    });
    if (data) {
      res.status(200).json(data);
    } else {
      console.log("data not found by barcode");
      res.status(200).json(data);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const fetchByid = async (req, res) => {
  try {
    const data = await Inventory.findByPk(req.params.id);
    if (data) {
      res.status(200).json(data);
    } else {
      console.log("data not found by id");
      res.status(200).json(data);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateInevntoryItem = async (req, res) => {
  uploadFunction.fields([
    { name: "coverImage", maxCount: 1 }, // Only one image allowed
  ])(req, res, async (err) => {
    if (err) {
      console.error("Error uploading files:", err);
      return res
        .status(400)
        .json({ message: "File upload failed.", error: err.message });
    }
    try {
      const existingProduct = await Inventory.findByPk(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found." });
      }
      // Check if a new cover image was uploaded, otherwise keep the existing one
      const coverImage = req.files["coverImage"]
        ? req.files["coverImage"][0].location
        : existingProduct.coverImage;
      const updatedProductData = {
        ...req.body,
        coverImage,
      };

      // Update the product with the new data
      const updatedProduct = await existingProduct.update(updatedProductData);
      console.log(updatedProduct);
      return res.status(200).json(updatedProduct);
    } catch (error) {
      console.log("2Inventory");
      console.log(error.message);
    }
  });
};

const removeInventoryProduts = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Invalid or Missing Ids" });
  }
  try {
    await Inventory.update({ isDeleted: true }, { where: { id: id } });
    res.status(200).json({ message: "item deleted(updated) sucessfully" });
  } catch (error) {
    console.log("Error updating(deleting) inventory item", error);
    res.status(500).json({ error: "Error updating(deleting) inventory item" });
  }
};

const updateTrakerOnBarcodeScan = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  const { orgId } = req.params;
  try {
    const planTrackerWithPlan = await PlanTracker.findOne({
      where: { orgId },
      transaction,
      include: [
        {
          model: User,
          as: "PlanTrackerShopkeeper",
          attributes: ["current_plan_id"],
          include: {
            model: Plan,
            as: "CurrentPlan",
            attributes: ["maxBarcodeScans"],
          },
        },
      ],
    });
    let countCreation = planTrackerWithPlan["countBarcodeScans"];
    let maxCreation =
      planTrackerWithPlan.PlanTrackerShopkeeper.CurrentPlan["maxBarcodeScans"];
    if (countCreation >= maxCreation) {
      await transaction.rollback();
      return res.status(403).json({
        message: "You have reached your limit.",
      });
    } else {
      await planTrackerWithPlan.increment(
        ["countBarcodeScans", "countApiCalls"],
        {
          by: 1,
          transaction,
        }
      );
      await transaction.commit();
      return res.status(200).json({
        message: "Scanner updated succesfully",
      });
    }
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.log(
      "error while checking restriction : inventoryController > updateTrakerOnBarcodeScan : 288",
      error.message
    );
    return res.status(500).json({ message: "internal server error" });
  }
};

module.exports = {
  createInventoryItem,
  getAllInventory,
  fetchByBarcode,
  updateInevntoryItem,
  fetchByid,
  removeInventoryProduts,
  updateTrakerOnBarcodeScan,
};
