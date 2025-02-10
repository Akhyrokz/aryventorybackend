const supplierOrg = require("../model/supplierOrganization");
const uploadFunction = require("../middleware/fileUpload");

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
    try {
      const orgLogo = req.files["orgLogo"]
        ? req.files["orgLogo"][0].location
        : null;

      const orgSignStamp = req.files["orgSignStamp"]
        ? req.files["orgSignStamp"][0].location
        : null;

      const reqBody = { ...req.body, orgLogo, orgSignStamp };
      const createdOrg = await supplierOrg.create(reqBody);

      if (!createdOrg || !createdOrg.id) {
        throw new Error("Failed to create organization.");
      }

      return res.status(201).json({
        message: "Organization created successfully.",
        organization: createdOrg,
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
  const supplierId = req.params.supplierId;
  try {
    // Fetch all organizations for the given supplierId
    const organizations = await supplierOrg.findAll({
      where: { supplierId: supplierId, isDeleted: false },
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
const getSupOrgById = async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await supplierOrg.findByPk(orgId); // Find organization by ID
    if (org) {
      res.status(200).json(org);
    } else {
      res.status(404).json({ message: "Organization not found." });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const editSupOrg = async (req, res) => {
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
      const existingOrganization = await supplierOrg.findByPk(orgId);

      if (!existingOrganization) {
        return res.status(404).json({ message: "Organization not found." });
      }

      const orgLogo = req.files["orgLogo"]
        ? req.files["orgLogo"][0].location
        : existingOrganization.orgLogo;

      const orgSignStamp = req.files["orgSignStamp"]
        ? req.files["orgSignStamp"][0].location
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
module.exports = { registerOrg, listOrg, getSupOrgById, editSupOrg };
