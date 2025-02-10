const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const inventoryController = require("../controllers/inventoryController");
const organizationController = require("../controllers/organizationController.js");
const subUserController = require("../controllers/subUserController.js");
const categoryController = require("../controllers/categoryController");
const brandController = require("../controllers/brandControllers.js");
const orderController = require("../controllers/orderController.js");
const orderItemsController = require("../controllers/orderItemsController.js");
const supplierProductController = require("../controllers/supplierProductController.js");
const deliveryStatusController = require("../controllers/deliveryStatusController.js");
const authenticateToken = require("../middleware/authMiddleware");
const cartController = require("../controllers/cartController.js");
const paymentController = require("../controllers/paymentController.js");
const customerBillController = require("../controllers/customerBillController.js");
const dashboardController = require("../controllers/dashboardController.js");
const feedbackController = require("../controllers/feedbackController.js");
const reportsController = require("../controllers/reportsController.js");
const ReportSalesItemController = require("../controllers/ReportSalesItemController.js");
const shopkeeperSalesController = require("../controllers/ShopkeepersalesController.js");
const favouriteController = require("../controllers/favouriteSupplierController.js");
const planController = require("../controllers/planController.js");
const planTrackerController = require("../controllers/planTrackerController.js");
const planRestrictionMiddleware = require("../middleware/planTracker.js");
const SupplierOrganization = require("../controllers/supplierOrganization.js");

//Auth Route
router.get("/verify-token", authenticateToken, userController.verifyToken);
// User Routes
router.post("/register", userController.registerAndSendOtp);
router.post("/login", userController.loginUser);
router.get("/suppliers/", userController.getSuppliersList);
router.get("/getUser/:userId", userController.getUser);
router.put("/updateUser/:id", userController.updateUser);
router.post("/logout", authenticateToken, userController.logoutUser);
router.post("/change-password", userController.changePassword);
router.post("/verifyOTP", userController.verifyOtp);
router.post("/resendOTP", userController.resendOtp);
// router.post('/close-account', authenticateToken, userController.closeAccount);
router.post("/forgotPassword", userController.forgotPassword);
router.put("/resetPassword", userController.resetPassword);

// Inventory Routes
router.post(
  "/inventory",
  planRestrictionMiddleware.checkLimit,
  inventoryController.createInventoryItem
);
router.put("/inventory/:id", inventoryController.updateInevntoryItem);
router.get("/getAllInventory", inventoryController.getAllInventory);
router.get(
  "/getProductByBarcode/:barCode/:id",
  inventoryController.fetchByBarcode
);
router.get("/getProductDetailByPK/:id", inventoryController.fetchByid);
router.put(
  "/removeInventoryItems/:id",
  inventoryController.removeInventoryProduts
);
router.put(
  "/updateTrakerOnBarcodeScan/:orgId",
  inventoryController.updateTrakerOnBarcodeScan
);
// Organization Routes
router.post("/registerOrg", organizationController.registerOrg);
router.get("/listOrgs/:shopKeeperId", organizationController.listOrg);
router.put("/editOrg/:orgId", organizationController.editOrg);
router.delete(
  "/deleteOrg/:shopkeeperId/:orgId",
  organizationController.deleteOrg
);
router.get("/checkOrg/:id", organizationController.checkOrganization);
router.get("/activeOrg/:shopKeeperId", organizationController.fetchActiveOrg);
router.get("/orgById/:orgId", organizationController.getOrgById);
router.put(
  "/updateActiveOrg/:orgId/:shopkeeperId",
  organizationController.updateActiveOrg
);
router.put("/activeEstimatedBill", organizationController.activeEstimatedBill);

// SubUser Routes
router.post(
  "/createSubUser",
  planRestrictionMiddleware.checkLimit,
  subUserController.createSubUser
);
router.get("/getUsersByOrg/:orgId", subUserController.getSubUserByOrg);
router.put("/subUser/:subUserId", subUserController.editSubUser);
router.delete("/subUsers/:orgId/:subUserId", subUserController.deleteSubUser);
router.get("/subUserById/:subUserId", subUserController.getSubUserById);

//categories route
router.post("/categories", categoryController.createCategory);
router.get("/categories", categoryController.getCategories);
// Get a category by ID
router.get("/categories/:id", categoryController.getCategoryById);
// Update a category by ID
router.put("/categories/:id", categoryController.updateCategory);
// Delete a category by ID
router.delete("/categories/:id", categoryController.deleteCategory);
router.get(
  "/categories/createdBy/:userId",
  categoryController.getCategoriesByCreatedBy
);

//routes for brand
router.get("/brand", brandController.getAllBrands);
// GET a single brand by ID
router.get("/brand/:id", brandController.getBrandById);
// POST a new brand
router.post("/brand", brandController.createBrand);
// PUT (update) a brand by ID
router.put("/brand/:id", brandController.updateBrand);
// DELETE a brand by ID
router.delete("/brand/:id", brandController.deleteBrand);
router.get("/brand/createdBy/:userId", brandController.getBrandsByCreatedBy);

// order Routes
router.post(
  "/makeOrder",
  planRestrictionMiddleware.checkLimit,
  orderController.makeOrder
);
router.get("/allOrdersByShopKeeper", orderController.orderDetails);
router.put(
  "/orderSupplierDelivery/:id",
  orderController.updateSupplierDelStatus
);
router.put("/setDeliveredDate/:id", orderController.setDeliveryDate);
router.get("/getOrderRequestDetails", orderController.getOrderRequestDetails);
router.put(
  "/updateOrderApprovedStatus",
  orderController.updateOrderApprovedStatus
);
router.get("/getOrderDetails/:orderId", orderController.getOrderById);
router.put("/updateOrderForBill/:orderId", orderController.updateOrderForBill);

//orderItem Routes
router.post("/addOderItems", orderItemsController.addOrderItems);
router.get(
  "/orderItemsByOrder/:id",
  orderItemsController.getOrderItemsByOrderId
);

// supplier Product Route
router.post("/addProduct", supplierProductController.addProduct);
router.get("/allProductList", supplierProductController.getAllProductList);
router.get(
  "/products/supplier/:supplierId",
  supplierProductController.getProductsBySupplierId
);
router.put("/products/:productId", supplierProductController.updateProduct);
router.get("/products/:productId", supplierProductController.getProductById);
router.get(
  "/products/barcode/:barcode/:productId",
  supplierProductController.getProductByBarcode
);
router.put(
  "/delete/products/:productId",
  supplierProductController.deleteProduct
);
router.get(
  "/orderItemsByProductId/:productId",
  supplierProductController.getDataOrderItemsByProductId
);

// Cart Routes for adding, updating, deleting and fetching the items
router.post("/cart/add-to-cart", cartController.addToCart);
router.patch("/cart/quantity/:id", cartController.updateCartItemQuantity);
router.delete("/cart/:id", cartController.deleteCartItem);
router.get("/cart-items/:shopkeeperId/:orgId", cartController.getAllCartItem);
router.get("/cartItems/:shopkeeperId/:orgId", cartController.getCartItem);
router.post("/deleteMultipleItems", cartController.deleteAllCartItem);

// Reports Products Route
// router.get('/products/date-range', productController.getProductsByDateRange);
router.get(
  "/products",
  planRestrictionMiddleware.checkLimit,
  ReportSalesItemController.getProductByInvoice
);
router.get(
  "/product/:id/details/:productName",
  ReportSalesItemController.getProductDetails
);
router.get(
  "/getSalesReportGroupByCategory/:orgId",
  planRestrictionMiddleware.checkLimit,
  ReportSalesItemController.getSalesReportGroupByCategory
);
// this is for excel report download by item
router.get(
  "/getProductListByDateFilter/excelDownload/:orgId",
  planRestrictionMiddleware.checkLimit,
  ReportSalesItemController.getProductListByDateFilter
);
router.get(
  "/getCategoryListByDateFilter/excelDownload/:orgId",
  planRestrictionMiddleware.checkLimit,
  ReportSalesItemController.getCategoryListByDateFilter
);

//add product into inventory of shopkeeper after Delivery confirmation
router.post(
  "/addProductsIntoInventory",
  deliveryStatusController.addSupplierProductsIntoInventory
);

// Dashboard screens routes
router.get(
  "/todaysSales/:shopkeeperId/:orgId",
  dashboardController.getTotalSalesToday
);
router.get(
  "/monthsSales/:shopkeeperId/:orgId",
  dashboardController.getTotalSalesMonth
);
router.get(
  "/lowQuantityProduct/:shopkeeperId/:orgId",
  dashboardController.getLowQuantityProducts
);
router.get(
  "/topSellingProduct/:shopkeeperId/:orgId",
  dashboardController.getTopSellingProducts
);
router.get(
  "/outOfStockProduct/:shopkeeperId/:orgId",
  dashboardController.getOutOfStockProducts
);
router.get(
  "/monthsBestPerformer/:shopkeeperId/:orgId",
  dashboardController.getMonthsBestPerformer
);
router.get(
  "/inventorySummary/:shopkeeperId/:orgId",
  dashboardController.getInventorySummary
);
router.get(
  "/getProductCountBySupplierId/:supplierId",
  dashboardController.getProductCountBySupplierId
);

router.get(
  "/getcustomer-bills/:orgId",
  customerBillController.getCustomerBills
);
router.get(
  "/getCustomerBillByInvoice/:orgId",
  customerBillController.getCustomerBillByInvoice
);
router.get(
  "/checkProductSold/:inventoryId",
  customerBillController.checkProductSold
);
router.post(
  "/customer-bills",
  planRestrictionMiddleware.checkLimit,
  customerBillController.createCustomerBill
);

//shopkeeperSales Route
router.get(
  "/shopkeepersales/:orgId",
  shopkeeperSalesController.getShopkeeperSalesByOrganization
);
//feedback
router.post("/feedback", feedbackController.submitFeedback);

//Payment Controller
router.post("/create-order", paymentController.createOrder);
router.post("/verify-payment", paymentController.verifyPayment);

// router.get('/razorpay-checkout', (req, res) => {
//   res.sendFile(path.join(__dirname, 'checkout.html')); // Adjust the path as necessary
// });

//Report by Employee
router.get("/shopkeeper/:userId/sales", reportsController.getSales);
router.get(
  "/shopkeeper/:employeeId/products",
  planRestrictionMiddleware.checkLimit,
  reportsController.getEmployeeProducts
);
router.get(
  "/employee-products/:id/details/:productName",
  reportsController.getProductDetailsofEmp
);
router.get("/columns", reportsController.getInventoryDetails);
//Report by Supplier
router.get("/supplier-data", reportsController.getSupplier);
// favourite supplier
router.post("/addFavouriteSupplier", favouriteController.addFavouriteSupplier);
router.get("/getFavouriteSupplier", favouriteController.getFavouriteSupplier);
router.get(
  "/getFavSuppliersListByOrgid/:orgId",
  favouriteController.getFavSuppliersListByOrgid
);
router.delete(
  "/removeFavouriteSupplier",
  favouriteController.removeFavouriteSupplier
);

// Subscription Plans
router.post("/plans", planController.createPlan);
router.get("/plans/active", planController.getAllActivePlans);
router.put("/plans/:id", planController.updatePlan);
router.get("/plans/:id", planController.planById);

// Plan Tracker routes
router.get("/planTracker", planTrackerController.getPlanTracker);

//update api for plan update
router.post("/upgrade-plan", userController.upgradeUserPlan);

router.get("/aws-check", (req, res) => {
  return res.json({ greet: "hello" });
});

// Supplier Organization Routes
router.post("/registerSupplierOrg", SupplierOrganization.registerOrg);
router.get("/list-supOrg/:supplierId", SupplierOrganization.listOrg);
router.get("/supOrgById/:orgId", SupplierOrganization.getSupOrgById);
router.put("/editSupOrg/:orgId", SupplierOrganization.editSupOrg);

// Handle incorrect endpoints
router.all("/*", (req, res) => {
  res.status(400).send({ status: false, message: "Endpoint is not correct" });
});

module.exports = router;
