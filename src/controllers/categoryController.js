const Category = require('../model/category');
// Create a new category
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Failed to create category.' });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll(
      // {order: [['name', 'ASC']]}
    );
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
};

// Get a single category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.status(200).json(category);
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ message: 'Failed to fetch category.' });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    
    await category.update(req.body);
    res.status(200).json(category);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Failed to update category.' });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    
    await category.destroy();
    res.status(200).json({ message: 'Category deleted.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Failed to delete category.' });
  }
};
// Get categories by createdBy (User ID)
const getCategoriesByCreatedBy = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { createdBy: req.params.userId },  // Fetch categories where createdBy matches userId
    });
    if (categories.length > 0) {
      res.status(200).json(categories);
    } else {
      res.status(404).json({ message: 'No categories found for this user' });
    }
  } catch (err) {
    console.error('Error fetching categories by createdBy:', err);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
};
module.exports = { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory,getCategoriesByCreatedBy };