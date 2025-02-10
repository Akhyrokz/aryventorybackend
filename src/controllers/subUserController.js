const SubUser = require("../model/subUser");
const uploadFunction = require("../middleware/fileUpload");
const { Op } = require("sequelize");
const User = require("../model/user");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { sequelize } = require("../config/config");
const { Transaction } = require("sequelize");

const createSubUser = async (req, res) => {
  uploadFunction.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async (err) => {
      if (err) {
        console.log(
          "Error > subUserController > createSubUser > image upload:",
          err.message
        );
        return res
          .status(400)
          .json({ message: "File upload failed", error: err.message });
      }

      try {
        const {
          shopkeeperId,
          orgId,
          fullName,
          gender,
          dob,
          address,
          state,
          country,
          pincode,
          phone,
          password,
          userType,
        } = req.body;
        let planData = req.planTracker;
        //Checking if the phone number already exists.
        if (phone) {
          const phoneInSubUser = await SubUser.findOne({
            where: {
              phone, isDeleted: false,
            },
          });

          const phoneInUser = await User.findOne({
            where: {
              phone,
            },
          });

          if (phoneInSubUser || phoneInUser) {
            return res.status(409).json({
              message: "Phone number already exists for another user.",
            });
          }
        }

        // Checking if Manager is already created.
        if (userType === "Manager") {
          const managerCreated = await SubUser.findOne({
            where: {
              shopkeeperId,
              orgId,
              userType: "Manager",
            },
          });
          if (managerCreated) {
            return res.status(422).json({
              message: "A Manager already exists for this organization.",
            });
          }
        }

        const image =
          req.files && req.files["image"]
            ? req.files["image"][0].location
            : null;

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Transaction for creating subuser and also updating the plan tracker count
        const subUser = await sequelize.transaction(
          { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
          async (t) => {
            const newSubUser = await SubUser.create(
              {
                shopkeeperId,
                orgId,
                fullName,
                gender,
                dob,
                address,
                state,
                country,
                pincode,
                subUserImage: image,
                phone,
                password: hashedPassword,
                userType,
              },
              { transaction: t }
            );

            if (!newSubUser) {
              throw new Error("Failed to create subuser.");
            }

            await planData.increment(["countSubUsers", "countApiCalls"], {
              by: 1,
              transaction: t,
            });

            return newSubUser;
          }
        );
        return res
          .status(201)
          .json({ message: "Subuser created successfully.", subUser });
      } catch (error) {
        console.log("Error creating a sub user:", error);
        return res
          .status(500)
          .json({ message: "Failed to create SubUser", error: error.message });
      }
    }
  );
};

const getSubUserByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({ message: "Organization id is required." });
  }

  try {
    const subUsers = await SubUser.findAll({
      where: { orgId: orgId, isDeleted: false },
      order: [["createdAt", "ASC"]],
    });

    if (subUsers.length === 0) {
      return res.status(200).json([]);
    }
    return res.status(200).json(subUsers);
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching the employees.",
      error: error,
    });
  }
};

const getSubUserById = async (req, res) => {
  const { subUserId } = req.params;
  try {
    const subuser = await SubUser.findByPk(subUserId, {
      attributes: { exclude: ["password"] },
    });
    if (!subuser) {
      return res.status(400).json({
        status: false,
        message: "Subuser not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Subuser found",
      subuser: subuser,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error while fetch sub user data",
      error: error,
    });
  }
};

const editSubUser = async (req, res) => {
  uploadFunction.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "File upload failed", error: err.message });
      }

      try {
        const { subUserId } = req.params;
        const { phone, shopkeeperId, orgId, userType } = req.body;

        //Checking if sub users exist for an id
        const existingUser = await SubUser.findByPk(subUserId);
        if (!existingUser) {
          return res.status(404).json({ message: "Subuser not found." });
        }

        //Checking if the updated phone number is used by other sub user
        if (phone) {
          const phoneInSubUser = await SubUser.findOne({
            where: {
              phone,
              id: { [Op.ne]: subUserId },
            },
          });

          const phoneInUser = await User.findOne({
            where: {
              phone,
            },
          });

          if (phoneInSubUser || phoneInUser) {
            return res.status(409).json({
              message: "Phone number already exists for another user.",
            });
          }
        }

        if (userType === "Manager") {
          const managerCreated = await SubUser.findOne({
            where: {
              id: { [Op.ne]: subUserId },
              shopkeeperId,
              orgId,
              userType: "Manager",
            },
          });
          if (managerCreated) {
            return res.status(422).json({
              message: "A Manager already exists for this organization.",
            });
          }
        }

        const image =
          req.files && req.files["image"]
            ? req.files["image"][0].location
            : null;

        const updatedData = {
          ...req.body,
          subUserImage: image || existingUser.subUserImage,
        };

        const updatedSubUser = await existingUser.update(updatedData);
        return res
          .status(200)
          .json({ message: "Subuser updated successfully.", updatedSubUser });
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Failed to update SubUser", error: error.message });
      }
    }
  );
};

// Delete a SubUser by Id
const deleteSubUser = async (req, res) => {
  const { orgId, subUserId } = req.params;

  try {
    const subUser = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        // Updating the flag.
        const delSubUser = await SubUser.update(
          { isDeleted: true },
          { where: { id: subUserId }, transaction: t }
        );

        if (delSubUser[0] === 0) {
          throw new Error("Error in deleting subUser.");
        }

        // Updating the count of org in plan tracker.
        const updateOrgCount = await PlanTracker.update(
          {
            countSubUsers: sequelize.literal(`"countSubUsers" - 1`),
            countApiCalls: sequelize.literal(`"countApiCalls" + 1`),
          },
          { where: { orgId }, transaction: t }
        );

        if (updateOrgCount[0] === 0) {
          throw new Error(
            "Failed to update the countSubUsers and countApiCalls when deleting subuser."
          );
        }

        return delSubUser;
      }
    );

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.log("Error in subUserController > deleteSubUser:", error.message);
    return res
      .status(500)
      .json({ error: "An error occurred while deleting the user." });
  }
};

module.exports = {
  createSubUser,
  getSubUserByOrg,
  editSubUser,
  deleteSubUser,
  getSubUserById,
};
