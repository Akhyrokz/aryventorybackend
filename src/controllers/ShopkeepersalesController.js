const { Sequelize, Op } = require('sequelize');
const CustomerBill = require('../model/CustomerBill');
const Inventory = require('../model/inventory');
const moment = require('moment');

const getShopkeeperSalesByOrganization = async (req, res) => {
    const { orgId } = req.params;
    try {
        const { category, brand, minAmt, maxAmt, color,startDate,endDate,searchByCustomerContact } = req.query;
        // Define filters
        const billWhereConditions = { orgId: orgId }; // Start with orgId as the base filter for CustomerBill

        // Price filters (applied to CustomerBill)
        if (minAmt || maxAmt) {
            billWhereConditions.productPrice = {};
            if (minAmt) {
                billWhereConditions.productPrice[Op.gte] = minAmt;
            }
            if (maxAmt) {
                billWhereConditions.productPrice[Op.lte] = maxAmt;
            }
        }
        if (searchByCustomerContact) {
            billWhereConditions.customerPhone = { [Op.iLike]: `%${searchByCustomerContact}%` };
        }
        if (startDate && endDate) {
            console.log(startDate, endDate);
        
            // Manually format the date to RFC 2822 or ISO 8601 format
            const formatToISO = (dateString) => {
                // Convert the date string to a valid ISO string format
                const date = new Date(dateString);
                return date.toISOString(); // Converts to "2024-11-03T12:40:00+05:30"
            };
        
            // Convert startDate and endDate to ISO 8601 format
            const start = moment(formatToISO(startDate));
            const end = moment(formatToISO(endDate));
        
            // Check if dates are valid
            if (!start.isValid() || !end.isValid()) {
                console.log('Invalid start or end date');
                return res.status(400).json({ message: 'Invalid date format' });
            }
        
            // Set the filter for invoiceDate to cover the full range of the provided dates
            billWhereConditions.invoiceDate = {
                [Op.gte]: start.toDate(), // Start date in proper JS Date format
                [Op.lte]: end.endOf('day').toDate() // End date adjusted to the end of the day
            };
        }
        // Step 1: Get bills with inventory details (joining Inventory table for filters)
        const bills = await CustomerBill.findAll({
            where: billWhereConditions,
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('invoiceDate')), 'invoiceDate'], // Group by date
                [Sequelize.fn('ARRAY_AGG', Sequelize.col('inventoryId')), 'inventoryIds'], // Aggregate inventory IDs
                [Sequelize.fn('ARRAY_AGG', Sequelize.col('quantity')), 'quantities'], // Aggregate quantities
                [Sequelize.fn('ARRAY_AGG', Sequelize.col('amount')), 'amounts'] // Aggregate amounts
            ],
            group: [
                Sequelize.fn('DATE', Sequelize.col('invoiceDate')), // Group by invoiceDate
            ],
            order: [[Sequelize.fn('DATE', Sequelize.col('invoiceDate')), 'DESC']], // Order by date descending
        });

        if (!bills || bills.length === 0) {
            return res.status(200).json([]); // Return an empty array if no bills found
        }

        // Step 2: Iterate over each bill and calculate total price based on amounts
        const inventoryIdCounts = {};
        bills.forEach(bill => {
            const billInventoryIds = bill.dataValues.inventoryIds;
            const billQuantities = bill.dataValues.quantities; // Fetch quantities
            const billAmounts = bill.dataValues.amounts; // Fetch amounts

            if (Array.isArray(billInventoryIds)) {
                billInventoryIds.forEach((id, index) => {
                    const quantity = billQuantities[index] || 1; // Default to 1 if no quantity is found
                    const amount = billAmounts[index] || 0; // Use amount if available, otherwise default to 0

                    // If this inventoryId already exists in the map, increment the count and total price
                    if (inventoryIdCounts[id]) {
                        inventoryIdCounts[id].quantity += quantity;
                        inventoryIdCounts[id].totalPrice += amount;
                    } else {
                        inventoryIdCounts[id] = {
                            quantity,
                            totalPrice: amount // Initialize with total price as the amount
                        };
                    }
                });
            }
        });

        const uniqueInventoryIds = Object.keys(inventoryIdCounts); // Get unique inventory IDs from the count map

        let inventoryDetails = [];
        if (uniqueInventoryIds.length) {
            const inventoryWhereConditions = { id: uniqueInventoryIds }; // For Inventory filters

            // Inventory filters (category, brand, color)
            if (category) {
                const categoryArray = category.split(',');
                inventoryWhereConditions.productCategory = {
                    [Op.or]: categoryArray.map(cat => ({
                        [Op.iLike]: `%${cat}%` // Case-insensitive search for category
                    }))
                };
            }
            if (brand) {
                const brandArray = brand.split(',');
                inventoryWhereConditions.productBrand = {
                    [Op.or]: brandArray.map(brd => ({
                        [Op.iLike]: `%${brd}%` // Case-insensitive search for brand
                    }))
                };
            }
            if (color) {
                const colorsArray = color.split(',');
                inventoryWhereConditions.productColor = {
                    [Op.or]: colorsArray.map(clr => ({
                        [Op.iLike]: `%${clr}%` // Case-insensitive search for color
                    }))
                };
            }
            inventoryDetails = await Inventory.findAll({
                where: inventoryWhereConditions,
                attributes: ['id', 'productName', 'coverImage'], // Fetch coverImage for product image
            });
            
        }
        // Step 3: Map the inventory details into a more accessible format
        const inventoryMap = {};
        inventoryDetails.forEach(item => {
            inventoryMap[item.id] = item; // Store by ID for easy access
        });

        // Step 4: Restructure the response with inventoryId, quantity, total price, and image
        const response = bills.map(bill => {
            const billInventoryCounts = {};
            const billInventoryIds = bill.dataValues.inventoryIds || [];

            // Populate billInventoryCounts with { inventoryId: quantity, totalPrice }
            billInventoryIds.forEach((id, index) => {
                const quantity = bill.dataValues.quantities[index] || 1;
                const totalPrice = bill.dataValues.amounts[index];
                if (id == inventoryMap[id]?.id) {
                    if (billInventoryCounts[id]) {
                        billInventoryCounts[id].quantity += quantity;
                        billInventoryCounts[id].totalPrice += totalPrice;
                    } else {
                        billInventoryCounts[id] = { quantity, totalPrice };
                    }
                }
            });

            return {
                invoiceDate: bill.dataValues.invoiceDate,
                inventoryItems: Object.keys(billInventoryCounts).map(id => {
                    if (id == inventoryMap[id]?.id) {
                        return {
                            inventoryId: id,
                            quantity: billInventoryCounts[id].quantity, // Quantity based on occurrences
                            totalPrice: billInventoryCounts[id].totalPrice, // Total price (sum of amounts)
                            productName: inventoryMap[id]?.productName || "Unknown", // Handle missing inventory
                            coverImage: inventoryMap[id]?.coverImage || null // Product image
                        };
                    }
                }).filter(item => item !== undefined) // Filter out undefined items
            };
        }).filter(bill => bill.inventoryItems.length > 0); // Filter out bills with empty inventoryItems

        res.status(200).json(response); 
    } catch (error) {
        console.error('Error fetching customer bills:', error);
        res.status(500).json({ message: 'Error fetching customer bills.', error });
    }
};

module.exports = { getShopkeeperSalesByOrganization };
