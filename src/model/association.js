const Order = require("./order");
const OrderItems = require("./orderItems");
const SupplierProduct = require("./supplierProduct");
const User = require("./user");
const Org = require("./organization");
const Inventory = require("./inventory");
const Cart = require("./cart");
const SubUser = require("./subUser");
const CustomerBill = require("./CustomerBill");
const FavouriteSupplier = require("./favouriteSupplier");
const Plan = require("./Plan");
const PlanTracker = require("../model/plansTracker");
const SupplierOrganization = require("./supplierOrganization");

const setupAssociations = () => {
  // Order and order items associations
  Order.hasMany(OrderItems, {  // One Order can have many OrderItems
    foreignKey: "orderId",
    as: "orderItems",
  });

  Order.belongsTo(User, {     // Order belongs to User
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });

  Order.belongsTo(SubUser, {
    foreignKey: 'subUserId',
    as: 'subUser'
  });

  Order.belongsTo(User, {
    foreignKey: "supplierId",
    as: "supplier",
  });

  Order.belongsTo(Org, {
    foreignKey: "orgId",
    as: "Organization",
  });

  OrderItems.belongsTo(SupplierProduct, {         // Each OrderItem references SupplierProduct
    foreignKey: "supplierProductId",
    as: "supplierProduct",
  });



  //Inventory association
  User.hasMany(Inventory, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  Inventory.belongsTo(User, {
    foreignKey: 'shopkeeperId',
    as: 'shopkeeper',
  });
  Inventory.belongsTo(SubUser, {
    foreignKey: 'subUserId',
    as: 'subUser'
  }
  );
  Inventory.belongsTo(Org, {
    foreignKey: 'orgId',
    as: 'organization'
  });
  // This defines that User has many SupplierProducts
  User.hasMany(SupplierProduct, {
    foreignKey: "supplierId",
    as: "supplierProducts",
  });
  SupplierProduct.belongsTo(User, {
    foreignKey: "supplierId",
    as: "supplier",
  });

  // Associations for Cart
  Cart.belongsTo(User, {
    foreignKey: "shopkeeperId",
    as: "shopOwner",
  });
  Cart.belongsTo(Org, {
    foreignKey: "orgId",
    as: "organization",
  });
  Cart.belongsTo(SubUser, {
    foreignKey: "subUserId",
    as: "subUser",
  })
  Cart.belongsTo(User, {
    foreignKey: "supplierId",
    as: "supplier",
  });
  Cart.belongsTo(SupplierProduct, {
    foreignKey: "supplierProductId",
    as: "supplierProduct",
  });

  // Association for Organization
  Org.belongsTo(User, {
    foreignKey: "shopkeeperId",
    as: "shopOwner",
  });

  // Assoication for Sub Users
  SubUser.belongsTo(User, {
    foreignKey: "shopkeeperId",
    as: "shopOwner",
  })
  SubUser.belongsTo(Org, {
    foreignKey: "orgId",
    as: "organization"
  });

  //customer bill association
  CustomerBill.belongsTo(User, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  CustomerBill.belongsTo(Inventory, {
    foreignKey: "inventoryId",
    as: "inventory",
  });
  CustomerBill.belongsTo(Org, {
    foreignKey: 'orgId',
    as: 'organization'
  });
  CustomerBill.belongsTo(SubUser, {
    foreignKey: "subUserId",
    as: "subUser",
  });



  // for fav supplier
  User.hasMany(FavouriteSupplier, {
    foreignKey: "supplierId",
    as: "Favourite",
  });
  FavouriteSupplier.belongsTo(User, {
    foreignKey: "supplierId",
    as: "suppliers",
  })

  Org.hasMany(FavouriteSupplier, {
    foreignKey: "orgId",
    as: "Favourite",
  });
  FavouriteSupplier.belongsTo(Org, {
    foreignKey: "orgId",
    as: "organization",
  });

  // Associations for Plans 
  Plan.hasMany(User, {
    foreignKey: "current_plan_id",
    as: "Users",
  });

  User.belongsTo(Plan, {
   foreignKey: "current_plan_id",
   as: "CurrentPlan", 
  });

  // Associations for PlanTracker
  User.hasMany(PlanTracker, {
    foreignKey: "shopkeeperId",
    as: "ShopkeeperPlanTracker",
  });
  
  PlanTracker.belongsTo(User, {
    foreignKey: 'shopkeeperId',
    as: "PlanTrackerShopkeeper"
  });

  Org.hasOne(PlanTracker, {
    foreignKey: "orgId",
    as: "OrgPlanTracker",
  })

  PlanTracker.belongsTo(Org, {
    foreignKey: "orgId",
    as: "PlanTrackerOrg"
  });

  User.hasMany(SupplierOrganization,{
    foreignKey: "supplierId",
    as: "supplierOrg",
  });
  SupplierOrganization.belongsTo(User, {
    foreignKey: "supplierId",
    as: "supplier"
  });

};

module.exports = setupAssociations;
