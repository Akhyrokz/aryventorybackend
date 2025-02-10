// controllers/brandController.js
const Brand = require('../model/brand');

// GET all brands
const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll(
      { order: [['name', 'ASC']],}
    );
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brands', error });
  }
};

// GET a single brand by ID
const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (brand) {
      res.json(brand);
    } else {
      res.status(404).json({ message: 'Brand not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brand', error });
  }
};

// POST a new brand
const createBrand = async (req, res) => {
  try {
    // Check if a brand with the same name already exists
    const existingBrand = await Brand.findOne({ where: { name: req.body.name } });
    if (existingBrand) {
      return res.status(400).json({ message: 'Brand with this name already exists' });
    }
    const newBrand = await Brand.create(req.body);
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(500).json({ message: 'Error creating brand', error });
  }
};

// PUT (update) a brand by ID
const updateBrand = async (req, res) => {
  try {
    const [updated] = await Brand.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedBrand = await Brand.findByPk(req.params.id);
      res.json(updatedBrand);
    } else {
      res.status(404).json({ message: 'Brand not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating brand', error });
  }
};

// DELETE a brand by ID
const deleteBrand = async (req, res) => {
  try {
    const deleted = await Brand.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Brand deleted' });
    } else {
      res.status(404).json({ message: 'Brand not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting brand', error });
  }
};

// GET brands by createdBy (User ID)
const getBrandsByCreatedBy = async (req, res) => {
  console.log(req.params)
  try {
    const brands = await Brand.findAll({
      where: { createdBy: req.params.userId }  // Fetch brands where createdBy matches userId
    });
    if (brands.length > 0) {
      res.json(brands);
    } else {
      res.status(404).json({ message: 'No brands found for this user' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brands by createdBy', error });
  }
};
module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandsByCreatedBy
};