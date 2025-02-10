const jwt = require("jsonwebtoken");
const User = require("../model/user");
const axios = require("axios");
const uploadFunction = require("../middleware/fileUpload");
const { PublishCommand, SNSClient } = require("@aws-sdk/client-sns");
const { Op } = require("sequelize");
const cron = require("node-cron");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const SubUser = require("../model/subUser");
const bcrypt = require("bcrypt");
const SupplierProduct = require("../model/supplierProduct");
const { Sequelize } = require("sequelize");
const Organizations = require("../model/organization");
const FavouriteSupplier = require("../model/favouriteSupplier");
const Plan = require("../model/Plan");
const PlanTracker = require("../model/plansTracker");
const SupplierOrganization = require("../model/supplierOrganization");

// Initialize SNS Client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.SNS_Access_Key,
    secretAccessKey: process.env.SNS_Secret_Key,
  },
});

// Function to send OTP to phone
const sendOtpToPhone = async (phone, otp) => {
  const formattedPhoneNumber = `+91${phone}`; // Format phone number
  const params = {
    Message: `${otp} is your OTP to login to Aryventory. DO NOT share with anyone. The OTP expires in 3 minutes.`,
    PhoneNumber: formattedPhoneNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    },
  };

  try {
    const result = await snsClient.send(new PublishCommand(params)); // Send SMS using v3 client
    return { messageId: result.MessageId };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

const registerAndSendOtp = async (req, res) => {
  const {
    phone,
    password,
    userType,
    isPrivacyPolicyAccepted,
    isTermsConditionAccepted,
  } = req.body;

  if (isPrivacyPolicyAccepted !== true && isTermsConditionAccepted !== true) {
    return res
      .status(400)
      .json({ error: "Privacy Policy and Terms & condition not accepted." });
  }

  // Check for mandatory fields
  if (!phone || !password) {
    return res
      .status(400)
      .json({ error: "Phone number and password are required." });
  }

  if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: "Phone number must be exactly 10 digits." });
  }

  // Password should be a 4-digit number
  const passwordRegex = /^\d{4}$/; // Matches exactly 4 digits

  // Validate password against regex
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: "Password must be a 4-digit number.",
    });
  }

  try {
    const existingUser = await User.findOne({ where: { phone } });

    if (existingUser) {
      if (existingUser.isverified) {
        return res
          .status(409)
          .json({ error: "Phone number is already verified and registered." });
      } else {
        await clearExpiredOtps();

        const otp = Math.floor(1000 + Math.random() * 9000);
        const otp_expiry = new Date();
        otp_expiry.setMinutes(otp_expiry.getMinutes() + 3);

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.update(
          {
            password: hashedPassword,
            otp,
            otp_expiry,
            userType,
            isverified: false,
          },
          { where: { phone } }
        );

        const otpResponse = await sendOtpToPhone(phone, otp);

        return res.status(200).json({
          message: "OTP sent to your phone number.",
        });
      }
    }

    await clearExpiredOtps();

    const otp = Math.floor(1000 + Math.random() * 9000);
    const otp_expiry = new Date();
    otp_expiry.setMinutes(otp_expiry.getMinutes() + 3);

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user, created] = await User.upsert({
      phone,
      password: hashedPassword,
      otp,
      otp_expiry,
      userType,
      isverified: false,
      current_plan_id: 1,
      isPrivacyPolicyAccepted: true,
      isTermsConditionAccepted: true,
    });

    const otpResponse = await sendOtpToPhone(phone, otp);

    res.status(200).json({
      message: "OTP sent to your phone number.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
};

// Function to clear expired OTPs
const clearExpiredOtps = async () => {
  const currentDateTime = new Date();
  try {
    await User.update(
      { otp: null, otp_expiry: null },
      {
        where: {
          otp_expiry: { [Op.lt]: currentDateTime },
        },
      }
    );
    await SubUser.update(
      { otp: null, otp_expiry: null },
      {
        where: {
          otp_expiry: { [Op.lt]: currentDateTime },
        },
      }
    );
  } catch (error) {
    console.log("Error clearing expired OTPs:", error);
  }
};

cron.schedule("* * * * *", () => {
  clearExpiredOtps();
});

const verifyToken = async (req, res) => {
  try {
    console.log("Verifying token for user ID:", req.user.id);

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found", valid: false });
    }

    console.log("User found:", user.toJSON());

    return res.status(200).json({
      message: "User found",
      valid: true,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Server error during token verification:", error);
    return res.status(500).json({ message: "Server error", valid: false });
  }
};

// Function to login user
const loginUser = async (req, res) => {
  const { phone, password, role } = req.body;

  if (!phone || !password || !role) {
    return res
      .status(400)
      .json({ error: "Phone number, password and role are required." });
  }

  try {
    let user = null;
    let orgData = {};
    let payLoad;
    let planData = {};
    let planTrackerData = {};
    if (role === "Shopkeeper" || role === "Supplier") {
      user = await User.findOne({ where: { phone: phone, userType: role } });

      if (!user) {
        return res.status(404).json({
          error: "User is not found.",
          message: "Please enter all the credentials carefully.",
        });
      }

      if (!user.isverified) {
        return res.status(403).json({
          error: "User is not verified.",
          message: "Please verify your OTP to login.",
        });
      }

      payLoad = user
        ? {
            id: user.id,
            userType: user.userType,
            isProfileCompleted: user.isProfileCompleted,
          }
        : null;

      if (role == "Shopkeeper") {
        payLoad.currentPlanId = user.current_plan_id;
        payLoad.trialExpiryDate = user.trialExpiryDate;
        payLoad.subscriptionEndDate = user.subscription_end_date;
        const organization = await Organizations.findOne({
          where: {
            shopkeeperId: user.id,
            isActive: true,
          },
        });
        if (organization) {
          orgData = organization;
          payLoad.organizationId = organization.id;
          payLoad.orgName = organization.orgName;
          const planTrackerWithPlan = await PlanTracker.findOne({
            where: {
              shopkeeperId: user.id,
              orgId: organization.id,
            },
            include: [
              {
                model: User,
                as: "PlanTrackerShopkeeper",
                attributes: ["subscription_end_date"],
                include: {
                  model: Plan,
                  as: "CurrentPlan",
                },
              },
            ],
          });
          planData = planTrackerWithPlan.PlanTrackerShopkeeper.CurrentPlan;
          planTrackerData.id = planTrackerWithPlan.id;
          planTrackerData.shopkeeperId = planTrackerWithPlan.shopkeeperId;
          planTrackerData.orgId = planTrackerWithPlan.orgId;
          planTrackerData.countOrganizations =
            planTrackerWithPlan.countOrganizations;
          planTrackerData.countSubUsers = planTrackerWithPlan.countSubUsers;
          planTrackerData.countReportsDownload =
            planTrackerWithPlan.countReportsDownload;
          planTrackerData.countReportViewsPerDay =
            planTrackerWithPlan.countReportViewsPerDay;
          planTrackerData.countProducts = planTrackerWithPlan.countProducts;
          planTrackerData.countBillsCreation =
            planTrackerWithPlan.countBillsCreation;
          planTrackerData.countOrdersPerMonth =
            planTrackerWithPlan.countOrdersPerMonth;
          planTrackerData.countBarcodeScans =
            planTrackerWithPlan.countBarcodeScans;
          planTrackerData.countApiCalls = planTrackerWithPlan.countApiCalls;
        }
      } else if (role == "Supplier") {
        const organization = await SupplierOrganization.findOne({
          where: {
            supplierId: user.id,
          },
        });
        if (organization) {
          orgData = organization;
          payLoad.organizationId = organization.id;
          payLoad.orgName = organization.orgName;
        }
      }
    } else if (role === "Employee") {
      user = await SubUser.findOne({
        where: { phone: phone, isDeleted: false },
        include: [
          {
            model: Organizations,
            as: "organization",
          },
        ],
      });

      if (!user) {
        return res.status(404).json({
          error: "User is not found.",
          message: "Please enter all the credentials carefully.",
        });
      }

      payLoad = user
        ? {
            id: user.id,
            userType: user.userType,
            organizationId: user.orgId,
            shopkeeperId: user.shopkeeperId,
            orgName: user.organization.orgName,
          }
        : null;
      orgData = user.organization;

      const planTrackerWithPlan = await PlanTracker.findOne({
        where: {
          shopkeeperId: user.shopkeeperId,
          orgId: user.orgId,
        },
        include: [
          {
            model: User,
            as: "PlanTrackerShopkeeper",
            attributes: [
              "trialExpiryDate",
              "current_plan_id",
              "subscription_end_date",
            ],
            include: {
              model: Plan,
              as: "CurrentPlan",
            },
          },
        ],
      });
      payLoad.currentPlanId =
        planTrackerWithPlan.PlanTrackerShopkeeper.current_plan_id;
      payLoad.trialExpiryDate =
        planTrackerWithPlan.PlanTrackerShopkeeper.trialExpiryDate;
      payLoad.subscriptionEndDate =
        planTrackerWithPlan.PlanTrackerShopkeeper.subscription_end_date;
      planData = planTrackerWithPlan.PlanTrackerShopkeeper.CurrentPlan;
      planTrackerData.id = planTrackerWithPlan.id;
      planTrackerData.shopkeeperId = planTrackerWithPlan.shopkeeperId;
      planTrackerData.orgId = planTrackerWithPlan.orgId;
      planTrackerData.countOrganizations =
        planTrackerWithPlan.countOrganizations;
      planTrackerData.countSubUsers = planTrackerWithPlan.countSubUsers;
      planTrackerData.countReportsDownload =
        planTrackerWithPlan.countReportsDownload;
      planTrackerData.countReportViewsPerDay =
        planTrackerWithPlan.countReportViewsPerDay;
      planTrackerData.countProducts = planTrackerWithPlan.countProducts;
      planTrackerData.countBillsCreation =
        planTrackerWithPlan.countBillsCreation;
      planTrackerData.countOrdersPerMonth =
        planTrackerWithPlan.countOrdersPerMonth;
      planTrackerData.countBarcodeScans = planTrackerWithPlan.countBarcodeScans;
      planTrackerData.countApiCalls = planTrackerWithPlan.countApiCalls;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: "Incorrect password.",
        message: "Please enter the password correctly.",
      });
    }
    const token = jwt.sign(payLoad, JWT_SECRET, { expiresIn: "7d" });
    console.log(token, "at jwt.sign");
    return res.status(200).json({
      user: payLoad,
      orgDetails: orgData,
      planData,
      planTrackerData,
      token,
    });
  } catch (error) {
    console.log("Error in login user:", error.message);
    return res.status(500).json({
      error: "Internal server error.",
      message: error,
    });
  }
};

// Function to verify OTP
const verifyOtp = async (req, res) => {
  const { phone, otp, userType } = req.body;

  if (!phone || !otp) {
    return res
      .status(400)
      .json({ error: "Phone number and OTP are required." });
  }

  try {
    if (userType == "Shopkeeper" || userType == "Supplier") {
      const user = await User.findOne({ where: { phone } });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const currentDateTime = new Date();

      // Check if the OTP is valid and not expired
      if (
        String(user.otp).trim() !== String(otp).trim() ||
        currentDateTime > user.otp_expiry
      ) {
        return res.status(401).json({ error: "Invalid or expired OTP." });
      }

      // Mark user as verified
      user.otp = null;
      user.otp_expiry = null;
      user.isverified = true;

      // Save changes to the database
      await user.save();

      res.status(200).json({ message: "OTP verified successfully." });
    } else {
      const subUser = await SubUser.findOne({ where: { phone } });
      if (!subUser) {
        return res.status(404).json({ error: "User not found." });
      }

      const currentDateTime = new Date();

      // Check if the OTP is valid and not expired
      if (
        String(subUser.otp).trim() !== String(otp).trim() ||
        currentDateTime > subUser.otp_expiry
      ) {
        return res.status(401).json({ error: "Invalid or expired OTP." });
      }

      subUser.otp = null;
      subUser.otp_expiry = null;

      await subUser.save();

      res.status(200).json({ message: "OTP verified successfully." });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Function to get all suppliers with optional filtering

const getSuppliersList = async (req, res) => {
  const {
    category,
    brand,
    state,
    city,
    pincode,
    orgId,
    limit,
    page,
    searchQuery,
  } = req.query;

  // Calculate offset for pagination
  const offset = ((page || 1) - 1) * (limit || 10);
  try {
    const whereConditions = {
      userType: "Supplier",
      isProfileCompleted: true,
    };
    console.log(req.query);
    if (searchQuery) {
      const lowerQuery = `%${searchQuery.toLowerCase()}%`;
      whereConditions[Op.or] = [
        { pincode: { [Op.iLike]: lowerQuery } },
        { city: { [Op.iLike]: lowerQuery } },
        { state: { [Op.iLike]: lowerQuery } },
        { address: { [Op.iLike]: lowerQuery } },
      ];
    }

    let productWhereClause = {};
    if (category) {
      const categoryArray = category.split(",");
      productWhereClause.productCategory = {
        [Op.or]: categoryArray.map((cat) => ({
          [Op.iLike]: `%${cat}%`, // Case-insensitive search for category
        })),
      };
    }
    if (brand) {
      const brandArray = brand.split(",");
      productWhereClause.productBrand = {
        [Op.or]: brandArray.map((brd) => ({
          [Op.iLike]: `%${brd}%`, // Case-insensitive search for brand
        })),
      };
    }
    if (Object.keys(productWhereClause).length === 0) {
      productWhereClause = null;
    }
    const suppliers = await User.findAll({
      where: whereConditions,
      include: [
        {
          model: SupplierProduct,
          as: "supplierProducts",
          where: productWhereClause,
          attributes: ["id", "productCategory", "productBrand"],
        },
      ],
      attributes: [
        "id",
        "fullName",
        "image",
        "userType",
        "country",
        "city",
        "pincode",
        "address",
        "state",
        "phone",
        "email",
      ],
      // limit: parseInt(limit || 10), // Number of records per page
      // offset: parseInt(offset), // Starting point
    });

    const favoriteSuppliers = await FavouriteSupplier.findAll({
      where: {
        orgId: orgId,
      },
      attributes: ["supplierId"],
    });

    const favoriteSupplierIds = favoriteSuppliers.map((fav) => fav.supplierId);

    // Append isFav flag to each supplier
    const suppliersWithFavStatus = suppliers.map((supplier) => ({
      ...supplier.toJSON(),
      isFav: favoriteSupplierIds.includes(supplier.id),
    }));

    res.status(200).json(suppliersWithFavStatus);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function to logout user
// const logoutUser = async (req, res) => {
//   const { userId } = req.body; // Extract userId from request body

//   // console.log("Logging out user with ID:", userId);

//   try {
//     let user;

//     // First try to find the user in the `User` model
//     user = await User.findByPk(userId);

//     // If not found in `User`, check `SubUser` model
//     if (!user) {
//       user = await SubUser.findByPk(userId);
//     }

//     // If still not found, return error
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Invalidate the refresh token or any active session (Stateful Logout)
//     await user.update({ refreshToken: null });

//     return res.status(200).json({ message: "Logged out successfully." });
//   } catch (error) {
//     console.error("Logout Error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

const logoutUser = async (req, res) => {
  try {
    const userId = req.user.id;

    let user = await User.findByPk(userId);
    if (!user) {
      user = await SubUser.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await user.update({ refreshToken: null });

    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getUser = async (req, res) => {
  const userId = req.params.userId;
  const role = req.query.role; // Get the role from query params
  // console.log("Received request for user ID:", userId, "with role:", role);

  try {
    let user;

    // Normalize role to lowercase for case-insensitive comparison
    const normalizedRole = role.toLowerCase();

    if (normalizedRole === "shopkeeper" || normalizedRole === "supplier") {
      // Fetch from User model
      user = await User.findByPk(userId);
      // console.log(`Fetched ${normalizedRole}:`, user);
    } else if (
      normalizedRole === "employee" ||
      normalizedRole === "salesperson" ||
      normalizedRole === "manager"
    ) {
      // Fetch from SubUser model and filter by role
      user = await SubUser.findOne({
        where: {
          id: userId,
          // Using Sequelize.fn to perform case-insensitive comparison
          [Sequelize.Op.and]: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("userType")),
            normalizedRole
          ),
        },
      });
      // console.log(`Fetched ${normalizedRole}:`, user);
    } else {
      // Invalid role specified
      res.status(400).json({ message: "Invalid role specified" });
      return;
    }

    // Return the user data or 404 if not found
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "Error fetching user data",
    });
  }
};

// Function to change user password
const changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({
      message:
        "Missing required fields: userId, currentPassword, or newPassword.",
    });
  }

  try {
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify the current password
    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Hash the new password before saving
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while changing the password." });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { userType, updateType } = req.query;

  uploadFunction.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "File upload failed.", error: err.message });
      }

      try {
        let user;
        if (userType === "Shopkeeper" || userType === "Supplier") {
          user = await User.findByPk(id);
        } else if (userType === "Manager" || userType === "SalesPerson") {
          user = await SubUser.findByPk(id);
        }

        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }

        let updateData = { ...req.body };

        const profilePictureUrl = req.files["image"]
          ? req.files["image"][0].location
          : null;

        if (profilePictureUrl) {
          if (userType === "Manager" || userType === "SalesPerson") {
            updateData.subUserImage = profilePictureUrl;
          } else if (userType === "Shopkeeper" || userType === "Supplier") {
            updateData.image = profilePictureUrl;
          }
        }

        if (userType === "Supplier" && updateType === "profileUpdate") {
          updateData.isProfileCompleted = true;
        }

        await user.update(updateData);

        return res
          .status(200)
          .json({ message: "Updated user successfully", userData: user });
      } catch (error) {
        console.log("Error updating user:", error);
        return res.status(500).json({
          error: error.message || "An error occurred while updating the user.",
        });
      }
    }
  );
};

// Function to resend OTP
const resendOtp = async (req, res) => {
  const { phone, userType } = req.body;

  try {
    if (userType == "Shopkeeper" || userType == "Supplier") {
      const user = await User.findOne({ where: { phone } });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const otp = Math.floor(1000 + Math.random() * 9000);
      user.otp = otp;
      user.otp_expiry = new Date(Date.now() + 3 * 60 * 1000);

      await user.save();
      await sendOtpToPhone(phone, otp);

      return res.status(200).json({ message: "OTP resent successfully." });
    } else if (userType == "Manager" || userType == "SalesPerson") {
      const subUser = await SubUser.findOne({ where: { phone } });
      if (!subUser) {
        return res.status(404).json({ message: "User not found." });
      }

      const otp = Math.floor(1000 + Math.random() * 9000);
      subUser.otp = otp;
      subUser.otp_expiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiry

      await subUser.save();
      await sendOtpToPhone(phone, otp);

      return res.status(200).json({ message: "OTP resent successfully." });
    }
  } catch (error) {
    console.log("Error resending OTP:", error);
    return res
      .status(500)
      .json({ message: "Internal server error. Please try again." });
  }
};

const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  async function generateAndSendOtp(model, phone) {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const otp_expiry = new Date();
    otp_expiry.setMinutes(otp_expiry.getMinutes() + 3);
    await model.update({ otp, otp_expiry }, { where: { phone } });
    const otpResponse = await sendOtpToPhone(phone, otp);
  }
  try {
    //Checking if the user's phone number exist in the db
    if (phone) {
      const phoneInUser = await User.findOne({
        where: { phone: phone },
      });

      const phoneInSubUser = await SubUser.findOne({
        where: { phone: phone },
      });

      if (!phoneInUser && !phoneInSubUser) {
        return res.status(404).json({
          error: "User not found. Please register to create an account.",
        });
      }

      await clearExpiredOtps();

      if (phoneInUser) {
        await generateAndSendOtp(User, phone);
        return res.status(200).json({
          message: "New OTP sent to your phone number.",
          userType: phoneInUser.userType,
        });
      } else if (phoneInSubUser) {
        await generateAndSendOtp(SubUser, phone);
        return res.status(200).json({
          message: "New OTP sent to your phone number.",
          userType: phoneInSubUser.userType,
        });
      }
    }
  } catch (error) {
    console.log("Error in forgot password", error);
    res.status(500).json({
      message: "Internal server error.",
      error: error,
    });
  }
};

const resetPassword = async (req, res) => {
  const { phone, userType, password } = req.body;
  try {
    if (userType == "Shopkeeper" || userType == "Supplier") {
      const user = await User.findOne({
        where: { phone: phone },
      });
      const hashedPassword = await bcrypt.hash(password, 10);
      await user.update({ password: hashedPassword }, { where: { phone } });
    } else if (userType == "Manager" || userType == "SalesPerson") {
      const subUser = await SubUser.findOne({
        where: { phone: phone },
      });
      const hashedPassword = await bcrypt.hash(password, 10);
      await subUser.update({ password: hashedPassword }, { where: { phone } });
    }
    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error });
  }
};

// Function to upgrade user plan
const upgradeUserPlan = async (req, res) => {
  const { userId, newPlanId, billingCycle } = req.body;

  if (!userId || !newPlanId || !billingCycle) {
    return res.status(400).json({
      success: false,
      message: "User  ID, new plan ID, and billing cycle are required.",
    });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User  not found.",
      });
    }

    const isSamePlan = user.current_plan_id === newPlanId;

    user.current_plan_id = newPlanId;
    user.subscription_start_date = new Date().toISOString().split("T")[0]; // Set to current date (YYYY-MM-DD)

    if (newPlanId === 1) {
      user.trialStartDate = new Date(); // Set to current date
      user.trialExpiryDate = new Date();
      user.trialExpiryDate.setDate(user.trialExpiryDate.getDate() + 14); // 14 days trial
      user.is_trial_expired = false; // Trial is active
    } else {
      user.trialStartDate = null;
      user.trialExpiryDate = null;
      user.is_trial_expired = true;
    }

    const currentDate = new Date();
    let subscriptionEndDate;

    switch (billingCycle) {
      case "Monthly":
        subscriptionEndDate = new Date(
          currentDate.setMonth(currentDate.getMonth() + 1)
        );
        break;
      case "Quarterly":
        subscriptionEndDate = new Date(
          currentDate.setMonth(currentDate.getMonth() + 3)
        );
        break;
      case "Half-Yearly":
        subscriptionEndDate = new Date(
          currentDate.setMonth(currentDate.getMonth() + 6)
        );
        break;
      case "Yearly":
        subscriptionEndDate = new Date(
          currentDate.setFullYear(currentDate.getFullYear() + 1)
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid billing cycle.",
        });
    }

    user.subscription_end_date = subscriptionEndDate
      .toISOString()
      .split("T")[0]; // Set the calculated end date (YYYY-MM-DD)

    const nextBillingDate = new Date(subscriptionEndDate);
    nextBillingDate.setDate(subscriptionEndDate.getDate() + 1);
    user.next_billing_date = nextBillingDate.toISOString().split("T")[0];
    user.plan_status = "active";
    user.plan_upgrade_date = new Date().toISOString().split("T")[0];
    user.is_plan_renewed = isSamePlan;

    if (user.trialExpiryDate && new Date() > user.trialExpiryDate) {
      user.is_trial_expired = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User  plan upgraded successfully.",
      user,
    });
  } catch (error) {
    console.error("Error upgrading user plan:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  verifyToken,
  registerAndSendOtp,
  verifyOtp,
  loginUser,
  getUser,
  updateUser,
  getSuppliersList,
  logoutUser,
  changePassword,
  resendOtp,
  forgotPassword,
  resetPassword,
  upgradeUserPlan,
};
