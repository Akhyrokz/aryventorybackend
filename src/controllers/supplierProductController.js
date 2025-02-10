const supplierProductModel = require("../model/supplierProduct");
const uploadFunction = require("../middleware/fileUpload")
const User = require('../model/user'); // Import the User model
const { Op } = require("sequelize");

const addProduct = async (req, res) => {
    console.log("in");
    uploadFunction.fields([
        { name: 'coverImage', maxCount: 1 },

    ])(req, res, async (err) => {
        if (err) {
            console.error('Error uploading files:', err);
            return res.status(400).json({ message: 'File upload failed.', error: err.message });
        }
        try {
            const coverImage = req.files['coverImage'] ? req.files['coverImage'][0].location : null;
            // Create supplier data object
            const productData = {
                ...req.body,
                coverImage, // Store the supplier image URL

            };
            const product = await supplierProductModel.create(productData);
            res.status(201).json(product);
        } catch (err) {
            console.error('Error creating product:', err);
            res.status(500).json({ message: 'Failed to create product.' });
        }
    });
}


const getAllProductList = async (req, res) => {
    try {
        const {
            category,
            brand,
            minAmt,
            maxAmt,
            color,
            supplierId,
            searchQuery,
        } = req.query;

        const whereConditions = {}; // Ensure you have this initialized

        if (category) {
            const categoryArray = category.split(',');
            whereConditions.productCategory = { [Op.in]: categoryArray };
        }
        if (brand) {
            const brandArray = brand.split(',');
            whereConditions.productBrand = { [Op.in]: brandArray };
        }
        if (color) {
            // Split the comma-separated colors into an array
            const colorsArray = color.split(',');
        
            // Add conditions for each color with partial match
            whereConditions.productColor = {
                [Op.or]: colorsArray.map((clr) => ({
                    [Op.like]: `%${clr}%`
                }))
            };
        }


        if (minAmt || maxAmt) {
            whereConditions.productPrice = {};
            if (minAmt) {
                whereConditions.productPrice[Op.gte] = minAmt;
            }
            if (maxAmt) {
                whereConditions.productPrice[Op.lte] = maxAmt;
            }
        }
        if (supplierId) {
            whereConditions.supplierId = supplierId;
        }
        if (searchQuery) {
            whereConditions.productName= { [Op.iLike]: `%${searchQuery.toLowerCase()}%` } 
        }
      
  
        // Fetch all products and include the supplier data
        const products = await supplierProductModel.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'supplier', // Reference the alias defined in the association
                    attributes: ['id', 'fullName', 'email'], // Specify the fields to retrieve from the User model
                }
            ]
        });
        res.status(200).json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Failed to fetch products.' });
    }
};


// Function to get products by supplier ID
const getProductsBySupplierId = async (req, res) => {
    const { supplierId } = req.params; // Get supplier ID from URL parameter
    const {
        category,
        brand,
        name,
        color,
        minAmt,
        maxAmt,
        supplierName,
        sortByPrice,
        lowStock,
        sortByQuantity
    } = req.query; // Extract query parameters

    // Create a dynamic 'where' condition for the product filters
    const whereConditions = { supplierId: Number(supplierId), isDeleted: false };

    // Handle multiple categories if present

    if (category) {
        const categoryArray = category.split(','); // Split the category query into an array
        whereConditions.productCategory = { [Op.in]: categoryArray }; // Filter by multiple categories using Op.in
    }
    if (brand) {
        const brandArray = brand.split(','); // Split the category query into an array
        whereConditions.productBrand = { [Op.in]: brandArray };
    }
    if (name) {
        whereConditions.productName = { [Op.like]: `%${name}%` }; // Filter by product name (partial match)
    }
    if (color) {
        // Split the comma-separated colors into an array
        const colorsArray = color.split(',');
    
        // Add conditions for each color with partial match
        whereConditions.productColor = {
            [Op.or]: colorsArray.map((clr) => ({
                [Op.like]: `%${clr}%`
            }))
        };
    }
    if (minAmt || maxAmt) {
        whereConditions.productPrice = {};
        if (minAmt) {
            whereConditions.productPrice[Op.gte] = minAmt; // Filter by minimum price
        }
        if (maxAmt) {
            whereConditions.productPrice[Op.lte] = maxAmt; // Filter by maximum price
        }
    }

    // Filter for low stock (if lowStock query param is true)
    if (lowStock === 'true') {
        whereConditions.productQuantity = { [Op.lt]: 20 }; // Filter products where quantity is less than 20
    }

    // Build the query for sorting
    const order = [];

    // Check if sorting by price is requested
    if (sortByPrice) {
        order.push(['productPrice', sortByPrice.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']); // Sort by price in ascending or descending order
    }
    // Check if sorting by quantity is requested
    else if (sortByQuantity) {
        order.push(['productQuantity', sortByQuantity.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']); // Sort by quantity in ascending or descending order
    }
    // Default sort by product quantity in ascending order (low to high)
    else {
        order.push(['productQuantity', 'ASC']);
    }
    console.log(whereConditions);
    try {
        const products = await supplierProductModel.findAll({
            where: whereConditions, // Filter products by supplierId
            include: [
                {
                    model: User,
                    as: 'supplier', // Reference the alias defined in the association
                    attributes: ['id', 'fullName', 'email'], // Specify the fields to retrieve from the User model
                }
            ],
            order
        });

        res.status(200).json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Failed to fetch products.' });
    }
};

// Function to update a product by productId
const updateProduct = async (req, res) => {

    uploadFunction.fields([
        { name: 'coverImage', maxCount: 1 }, // Only one image allowed
    ])(req, res, async (err) => {
        if (err) {
            console.error('Error uploading files:', err);
            return res.status(400).json({ message: 'File upload failed.', error: err.message });
        }

        try {
            const productId = req.params.productId; // Get the product ID from the URL

            // Find the product by its primary key
            const existingProduct = await supplierProductModel.findByPk(productId);
            if (!existingProduct) {
                return res.status(404).json({ message: 'Product not found.' });
            }

            // Check if a new cover image was uploaded, otherwise keep the existing one
            const coverImage = req.files['coverImage'] ? req.files['coverImage'][0].location : existingProduct.coverImage;

            // Prepare the updated product data (spread `req.body` and override `coverImage`)
            const updatedProductData = {
                ...req.body,   // Contains all form fields (except files)
                coverImage,    // Use the new or existing image
            };

            // Update the product with the new data
            const updatedProduct = await existingProduct.update(updatedProductData);

            // Return the updated product as the response
            return res.status(200).json(updatedProduct);

        } catch (err) {
            console.error('Error updating product:', err);
            return res.status(500).json({ message: 'Failed to update product.', error: err.message });
        }
    });
};


// Function to get a product by product ID
const getProductById = async (req, res) => {
    const { productId } = req.params;
    try {

        const product = await supplierProductModel.findByPk(productId, {
            include: [
                {
                    model: User,
                    as: 'supplier', // Reference the alias defined in the association
                    attributes: ['id', 'fullName', 'email'], // Specify the fields to retrieve from the User model
                }
            ]
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json(product);
    } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json({ message: 'Failed to fetch product.' });
    }
};
const getProductByBarcode = async (req, res) => {
    const { barcode } = req.params; // Get barcode from URL parameter
    try {
        // Find the product by barcode
        const product = await supplierProductModel.findOne({
            where: { BarCode: barcode, isDeleted: false }, // Filter by barcode
            include: [
                {
                    model: User,
                    as: 'supplier', // Reference the alias defined in the association
                    attributes: ['id', 'fullName', 'email'], // Fields to retrieve from User model
                }
            ]
        });
        // If no product is found
        if (!product) {
            return res.status(404).json({ message: 'Product not found with the given barcode.' });
        }

        // Return the product data
        res.status(200).json(product);
    } catch (err) {
        console.error('Error fetching product by barcode:', err);
        res.status(500).json({ message: 'Failed to fetch product.' });
    }
};





const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId; // Get the product ID from the URL

        // Find the product by its primary key
        const existingProduct = await supplierProductModel.findByPk(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        await existingProduct.update({ isDeleted: true });
        res.status(200).json({ message: "Product Deleted Successfully" })
    } catch (error) {

    }
}



const getDataOrderItemsByProductId = async(req,res) =>{
    try{
        const productId=req.params.productId;
        
        const product= await supplierProductModel.findByPk(productId);
        if(product){
            return res.status(200).json(product);
        }else{
            return res.status(404).json({error:'product not found by with this ID'});
        }
    }catch(error){
        return res.status(500).json({message:error.message});
    }
}

module.exports = { addProduct, getAllProductList, getProductsBySupplierId, updateProduct, getProductById, getProductByBarcode, deleteProduct,getDataOrderItemsByProductId };