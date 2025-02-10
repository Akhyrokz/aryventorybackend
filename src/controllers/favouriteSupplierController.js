const FavouriteSupplier = require("../model/favouriteSupplier");
const SupplierProduct = require("../model/supplierProduct");
const Organizations = require("../model/organization");
const User = require("../model/user");
const { Op } = require("sequelize");

const addFavouriteSupplier = async (req, res) => {
    try {
        const { supplierId, orgId } = req.body;
        const favouriteSupplier = await FavouriteSupplier.create({ supplierId, orgId });
        res.status(200).json(favouriteSupplier);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getFavouriteSupplier = async (req, res) => {
    const { supplierId, orgId } = req.query;
    let whereClause = {};
    if (supplierId) whereClause.supplierId = supplierId;
    if (orgId) whereClause.orgId = orgId;
    const favouriteSupplier = await FavouriteSupplier.findAll(
        {
            where: whereClause,
            include:[{
                model:User,
                as:'suppliers',
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
                  ],
            }]
        }
    );
    res.status(200).json(favouriteSupplier);
}

const getFavSuppliersListByOrgid = async (req, res) => {
    const { category, brand, state, city, pincode ,searchQuery} = req.query;
    const { orgId } = req.params
    const whereConditions = {
        userType: "Supplier",
      };
    if (searchQuery) {
        const lowerQuery = `%${searchQuery.toLowerCase()}%`;
        whereConditions[Op.or] = [
          { pincode: { [Op.iLike]: lowerQuery } },
          { city: { [Op.iLike]: lowerQuery } },
          { state: { [Op.iLike]: lowerQuery } },
          { address: { [Op.iLike]: lowerQuery } }
        ];
      }
      let productWhereClause = {};
      if (category) {
        const categoryArray = category.split(',');
        productWhereClause.productCategory = {
          [Op.or]: categoryArray.map(cat => ({
            [Op.iLike]: `%${cat}%`
          }))
        };
      }
      if (brand) {
        const brandArray = brand.split(',');
        productWhereClause.productBrand = {
          [Op.or]: brandArray.map(brd => ({
            [Op.iLike]: `%${brd}%` 
          }))
        };
      }
      if (Object.keys(productWhereClause).length === 0) {
        productWhereClause = null;
      }
    try {
        const suppliers = await User.findAll({
            where:whereConditions,
            include: [
                {
                    model: SupplierProduct,
                    as: "supplierProducts",
                    where: productWhereClause,
                    attributes: ["id", "productCategory", "productBrand"]
                },
                {
                    model: FavouriteSupplier,
                    as:'Favourite',
                    where: {
                        orgId: Number(orgId)
                    }
                },
            ],
            attributes: ['id', 'fullName', 'image', 'userType', 'country', 'city', 'pincode', 'address', 'state', 'phone', "email"],


        });
        res.status(200).json(suppliers);
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const removeFavouriteSupplier = async (req, res) => {
    try {
        const { supplierId, orgId } = req.body;

        if (!supplierId || !orgId) {
            return res.status(400).json({ message: "Supplier ID and Organization ID are required" });
        }

        const result = await FavouriteSupplier.destroy({
            where: {
                supplierId: supplierId,
                orgId: orgId,
            }

        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Favourite supplier not found" });
        }

        res.status(200).json({ message: "Favourite supplier removed successfully" });
    } catch (error) {
        console.error("Error removing favourite supplier:", error);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = { addFavouriteSupplier, getFavouriteSupplier, getFavSuppliersListByOrgid, removeFavouriteSupplier };