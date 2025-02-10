const Organizations = require("../model/organization");
const uploadFunction = require("../middleware/fileUpload");
const SubUser = require("../model/subUser");
const { or, Sequelize } = require("sequelize");
const User = require("../model/user");
const { sequelize } = require("../config/config");
const PlanTracker = require("../model/plansTracker");
const { Transaction } = require("sequelize");
const Plan = require("../model/Plan");
const SupplierOrganization = require("../model/supplierOrganization");

const registerOrg = async (req, res) => {
  uploadFunction.fields([
    { name: "orgLogo", maxCount: 1 },
    { name: "orgSignStamp", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      console.error("File upload error:", err);
      return res
        .status(400)
        .json({ message: "File upload failed.", error: err.message });
    }
    console.log("uploaded files", req.files);

    try {
      const orgLogo = req.files["orgLogo"]
        ? req.files["orgLogo"][0].path
        : null;

      const orgSignStamp = req.files["orgSignStamp"]
        ? req.files["orgSignStamp"][0].path
        : null;

      if (!req.files || !req.files["orgLogo"] || !req.files["orgSignStamp"]) {
        console.log("Both logos are required -req.files issue");
        return res.json({ message: "Both logos are requireed" });
      }

      const {
        shopkeeperId,
        orgName,
        orgPhone,
        orgEmail,
        orgGST,
        address,
        state,
        country,
        pincode,
        isActive,
      } = req.body;

      const org = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
          const createdOrg = await Organizations.create(
            {
              shopkeeperId,
              orgName,
              orgPhone,
              orgEmail,
              orgGST,
              address,
              state,
              country,
              pincode,
              orgLogo,
              orgSignStamp,
              isActive,
            },
            { transaction: t }
          );

          if (!createdOrg || !createdOrg.id) {
            throw new Error("Failed to create organization.");
          }

          const createPlanTracker = await PlanTracker.create(
            {
              shopkeeperId: shopkeeperId,
              orgId: createdOrg.id,
            },
            { transaction: t }
          );

          if (!createPlanTracker) {
            throw new Error("Failed to update plan tracker table.");
          }

          if (isActive !== "true") {
            const anyOnePlanTracker = await PlanTracker.findOne({
              where: {
                shopkeeperId,
              },
              include: [
                {
                  model: User,
                  as: "PlanTrackerShopkeeper",
                  attributes: ["current_plan_id"],
                  include: {
                    model: Plan,
                    as: "CurrentPlan",
                    attributes: ["maxOrganizations"],
                  },
                },
              ],
              transaction: t,
            });

            const {
              countOrganizations,
              PlanTrackerShopkeeper: {
                CurrentPlan: { maxOrganizations } = {},
              } = {},
            } = anyOnePlanTracker;

            if (countOrganizations >= maxOrganizations) {
              throw new Error("Reached limit for organization creation.");
            }

            const updatedOrgCount = await PlanTracker.update(
              { countOrganizations: countOrganizations + 1 },
              {
                where: {
                  shopkeeperId: shopkeeperId,
                },
                transaction: t,
              }
            );

            if (updatedOrgCount[0] === 0) {
              throw new Error(
                "Error updating the countOrganization for shopkeeper"
              );
            }

            const updatedApiCount = await PlanTracker.update(
              { countApiCalls: sequelize.literal('"countApiCalls" + 1') },
              {
                where: { id: createPlanTracker.id },
                transaction: t,
              }
            );
            if (updatedApiCount[0] === 0) {
              throw new Error(
                "Error updating the countOrganization for shopkeeper"
              );
            }
          }

          if (isActive === "true") {
            await createPlanTracker.increment(
              ["countOrganizations", "countApiCalls"],
              { by: 1, transaction: t }
            );

            // Setting expire after 14 days at 11:59:59:999 pm
            const trialStartDate = new Date();
            const trialExpiryDate = new Date(trialStartDate);
            trialExpiryDate.setDate(trialStartDate.getDate() + 14);
            trialExpiryDate.setHours(23, 59, 59, 999);

            const userUpdateResult = await User.update(
              {
                trialStartDate,
                trialExpiryDate,
              },
              { where: { id: shopkeeperId }, transaction: t }
            );

            if (userUpdateResult[0] === 0) {
              throw new Error("Failed to update user trial dates.");
            }
          }

          return createdOrg;
        }
      );
      return res.status(201).json({
        message: "Organization created successfully.",
        organization: org,
      });
    } catch (err) {
      console.error("Error creating organization:", err);
      return res
        .status(500)
        .json({ message: "Failed to create organization." });
    }
  });
};

const listOrg = async (req, res) => {
  const shopKeeperId = req.params.shopKeeperId;
  try {
    // Fetch all organizations for the given shopKeeperId
    const organizations = await Organizations.findAll({
      where: { shopkeeperId: shopKeeperId, isDeleted: false },
      order: [["createdAt", "ASC"]],
    });

    // Check if organizations were found
    if (organizations.length > 0) {
      res.json(organizations); // Directly return the fetched organizations
    } else {
      res.status(404).json({ message: "No organizations found." });
    }
  } catch (err) {
    console.error("Error retrieving organizations:", err);
    res.status(500).json({ message: "Failed to retrieve organizations." });
  }
};

const editOrg = async (req, res) => {
  uploadFunction.fields([
    { name: "orgLogo", maxCount: 1 },
    { name: "orgSignStamp", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      console.error("Error uploading files:", err);
      return res
        .status(400)
        .json({ message: "File upload failed.", error: err.message });
    }

    try {
      const { orgId } = req.params;
      const existingOrganization = await Organizations.findByPk(orgId);

      if (!existingOrganization) {
        return res.status(404).json({ message: "Organization not found." });
      }

      const orgLogo = req.files["orgLogo"]
        ? req.files["orgLogo"][0].path
        : existingOrganization.orgLogo;

      const orgSignStamp = req.files["orgSignStamp"]
        ? req.files["orgSignStamp"][0].path
        : existingOrganization.orgSignStamp;

      const updatedOrgData = {
        ...req.body,
        orgLogo,
        orgSignStamp,
      };

      const updatedOrg = await existingOrganization.update(updatedOrgData);
      res.status(200).json({
        message: "Organization updated successfully.",
        updatedOrg: updatedOrg,
      });
    } catch (error) {
      console.log("Error updating organization:", error);
      res.status(500).json({
        message: "Internal server error while updating organization.",
        error: error.message,
      });
    }
  });
};

const deleteOrg = async (req, res) => {
  const { shopkeeperId, orgId } = req.params;

  try {
    const org = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        // Updating the flag.
        const delOrg = await Organizations.update(
          { isDeleted: true },
          { where: { id: orgId, isActive: false }, transaction: t }
        );

        if (delOrg[0] === 0) {
          throw new Error("Error in deleting organization.");
        }

        // Updating the flag for subuser who belongs to this orgId
        try {
          const delSubUser = await SubUser.update(
            { isDeleted: true },
            { where: { shopkeeperId, orgId }, transaction: t }
          );

          if (delSubUser[0] === 0) {
            console.log("No sub users found for the given organization.");
          }
        } catch (error) {
          console.error(
            "Error deleleting sub users for deleted org:",
            error.message
          );
          throw new Error("Failed to delele sub users for the deleted org.");
        }

        // Updating the count of org in plan tracker.
        const updateOrgCount = await PlanTracker.update(
          {
            countOrganizations: sequelize.literal(`"countOrganizations" - 1`),
          },
          { where: { shopkeeperId }, transaction: t }
        );

        if (updateOrgCount[0] === 0) {
          throw new Error(
            "Failed to update the countOrganization when deleting organization."
          );
        }

        // Finding the active org to updates its api calls.
        const activeOrg = await Organizations.findOne({
          where: { shopkeeperId, isActive: true },
          transaction: t,
        });

        if (!activeOrg) {
          throw new Error("No active organization found for the shopkeeper.");
        }

        const updateApiCount = await PlanTracker.update(
          {
            countApiCalls: sequelize.literal(`"countApiCalls" + 1`),
          },
          { where: { shopkeeperId, orgId: activeOrg.id }, transaction: t }
        );

        if (updateApiCount[0] === 0) {
          throw new Error(
            "Failed to update the countApiCalls when deleting organization."
          );
        }

        return delOrg;
      }
    );
    return res
      .status(200)
      .json({ message: "Organization deleted successfully." });
  } catch (err) {
    console.error("Error deleting organization:", err);
    return res
      .status(500)
      .json({ message: "Failed to delete organization.", error: err.message });
  }
};

const checkOrganization = async (req, res) => {
  const userId = req.params.id;
  const { userType } = req.query;
  try {
    let organizations;
    if (userType == "Shopkeeper") {
      organizations = await Organizations.findAll({
        where: {
          shopkeeperId: userId,
          isDeleted: false,
        },
        order: [["createdAt", "ASC"]],
      });
    } else {
      organizations = await SupplierOrganization.findAll({
        where: {
          supplierId: userId,
          isDeleted: false,
        },
        order: [["createdAt", "ASC"]],
      });
    }
    console.log("organizations", organizations.length);
    if (organizations.length > 0) {
      res.status(200).json({
        success: true,
        navigateTo: "Home",
      });
    } else {
      res.status(200).json({
        success: true,
        // navigateTo: "CreateOrganization",
        navigateTo: "Home",
      });
    }
  } catch (error) {
    console.error("Error while checking organization for the user:", error);
    res.status(500).json({
      status: false,
      message: "Failed to check organization.",
      error: error.message,
    });
  }
};

const fetchActiveOrg = async (req, res) => {
  try {
    const shopkeeperId = req.params.shopKeeperId;
    const organizations = await Organizations.findOne({
      where: {
        shopkeeperId: shopkeeperId,
        isActive: true,
        isDeleted: false,
      },
    });
    res.status(200).json(organizations);
  } catch (error) {
    console.error(error.message);
  }
};

const getOrgById = async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organizations.findByPk(orgId); // Find organization by ID
    if (org) {
      res.status(200).json(org);
    } else {
      res.status(404).json({ message: "Organization not found." });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateActiveOrg = async (req, res) => {
  try {
    const { orgId, shopkeeperId } = req.params;
    // Using transaction for updating the active since two rows are affected
    const updatedActiveOrg = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const previousActive = await Organizations.update(
          { isActive: false },
          {
            where: { shopkeeperId, isActive: true },
            transaction: t,
          }
        );

        if (!previousActive) {
          throw new Error("Failed to deactive active organization.");
        }

        const orgToBeActive = await Organizations.update(
          { isActive: true },
          {
            where: { id: orgId },
            transaction: t,
          }
        );

        if (orgToBeActive[0] === 0) {
          throw new Error("Failed to make organization acitve.");
        }

        const activeOrg = await Organizations.findByPk(orgId, {
          include: [
            {
              model: PlanTracker,
              as: "OrgPlanTracker",
            },
          ],
          transaction: t,
        });

        if (!activeOrg) {
          throw new Error("Failed to fetch the active organization.");
        }

        return activeOrg;
      }
    );

    const { OrgPlanTracker } = updatedActiveOrg;
    const orgData = {
      id: updatedActiveOrg.id,
      shopkeeperId: updatedActiveOrg.shopkeeperId,
      orgName: updatedActiveOrg.orgName,
      orgPhone: updatedActiveOrg.orgPhone,
      orgEmail: updatedActiveOrg.orgEmail,
      orgGST: updatedActiveOrg.orgGST,
      address: updatedActiveOrg.address,
      state: updatedActiveOrg.state,
      country: updatedActiveOrg.country,
      pincode: updatedActiveOrg.pincode,
      orgLogo: updatedActiveOrg.orgLogo,
      orgSignStamp: updatedActiveOrg.orgSignStamp,
      isActive: updatedActiveOrg.isActive,
      isEstimated: updatedActiveOrg.isEstimated,
      isDeleted: updatedActiveOrg.isDeleted,
    };
    return res
      .status(200)
      .json({ orgData: orgData, planTracker: OrgPlanTracker });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Failed to switch organization", error: error.message });
  }
};

const activeEstimatedBill = async (req, res) => {
  const { isEstimated, orgId } = req.query;

  try {
    const org = await Organizations.findByPk(orgId);
    await org.update({ isEstimated: isEstimated });
    res.status(200).json({ message: "Organization updated successfully", org });
  } catch (error) {
    console.error("Error updating organization:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the organization" });
  }
};

module.exports = {
  registerOrg,
  listOrg,
  editOrg,
  deleteOrg,
  checkOrganization,
  fetchActiveOrg,
  getOrgById,
  updateActiveOrg,
  activeEstimatedBill,
};
