const Plan = require('../model/Plan');

// Post API to create a plan.
const createPlan = async (req, res) => {
    try {
        const {
            planName,
            trialPeriodDays,
            maxOrganizations,
            maxSubUsers,
            maxReportsDownload,
            maxReportViewsPerDay,
            maxProducts,
            maxBillsCreation,
            maxOrdersPerMonth,
            maxBarcodeScans,
            maxApiCalls,
            supportLevel,
            status,
            price,
            billingCycle
        } = req.body;

        // Basic validation
        if (!planName) {
            return res.status(400).json({
                success: false,
                error: 'Plan name is required'
            });
        }

        // Validate enums
        const validSupportLevels = ['None', 'Email', 'Phone', 'Email Phone'];
        const validStatus = ['Active', 'Inactive'];
        const validBillingCycles = ['Monthly', 'Yearly', 'Half-Yearly', 'Quarterly'];

        if (supportLevel && !validSupportLevels.includes(supportLevel)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid support level'
            });
        }

        if (status && !validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        if (billingCycle && !validBillingCycles.includes(billingCycle)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid billing cycle'
            });
        }

        // Validate numeric fields are positive
        const numericFields = {
            trialPeriodDays,
            maxOrganizations,
            maxSubUsers,
            maxReportsDownload,
            maxReportViewsPerDay,
            maxProducts,
            maxBillsCreation,
            maxOrdersPerMonth,
            maxBarcodeScans,
            maxApiCalls,
            price
        };

        for (const [field, value] of Object.entries(numericFields)) {
            if (value !== undefined && value < 0) {
                return res.status(400).json({
                    success: false,
                    error: `${field} cannot be negative`
                });
            }
        }

        // Create plan with validated data
        const newPlan = await Plan.create({
            planName,
            trialPeriodDays,
            maxOrganizations,
            maxSubUsers,
            maxReportsDownload,
            maxReportViewsPerDay,
            maxProducts,
            maxBillsCreation,
            maxOrdersPerMonth,
            maxBarcodeScans,
            maxApiCalls,
            supportLevel,
            status,
            price,
            billingCycle
        });

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: newPlan
        });
    } catch (error) {
        // Handle specific database errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'A plan with this name already exists'
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            error: 'Error creating plan: ' + error.message
        });
    }
};

// Get API to get all the active plan.
const getAllActivePlans = async (req, res) => {
    try {
       
        const plans = await Plan.findAll({
            where: {
                status: 'Active'
            }
        });

        
        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active plans found'
            });
        }

        res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error fetching plans: ' + error.message
        });
    }
};

// Put API to update a plan.
const updatePlan = async (req, res) => {
    try {
        const planId = req.params.id;
        
        // Check if plan exists
        const plan = await Plan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }

        const {
            planName,
            trialPeriodDays,
            maxOrganizations,
            maxSubUsers,
            maxReportsDownload,
            maxReportViewsPerDay,
            maxProducts,
            maxBillsCreation,
            maxOrdersPerMonth,
            maxBarcodeScans,
            maxApiCalls,
            supportLevel,
            status,
            price,
            billingCycle
        } = req.body;

        // Validate enums
        const validSupportLevels = ['None', 'Email', 'Phone', 'Email Phone'];
        const validStatus = ['Active', 'Inactive'];
        const validBillingCycles = ['Monthly', 'Yearly'];

        if (supportLevel && !validSupportLevels.includes(supportLevel)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid support level'
            });
        }

        if (status && !validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        if (billingCycle && !validBillingCycles.includes(billingCycle)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid billing cycle'
            });
        }

        // Validate numeric fields are positive
        const numericFields = {
            trialPeriodDays,
            maxOrganizations,
            maxSubUsers,
            maxReportsDownload,
            maxReportViewsPerDay,
            maxProducts,
            maxBillsCreation,
            maxOrdersPerMonth,
            maxBarcodeScans,
            maxApiCalls,
            price
        };

        for (const [field, value] of Object.entries(numericFields)) {
            if (value !== undefined && (field === 'price' ? value < 0 : value < 0)) {
                return res.status(400).json({
                    success: false,
                    error: `${field} cannot be negative`
                });
            }
        }

        // Update plan with validated data
        await plan.update({
            planName: planName || plan.planName,
            trialPeriodDays: trialPeriodDays || plan.trialPeriodDays,
            maxOrganizations: maxOrganizations || plan.maxOrganizations,
            maxSubUsers: maxSubUsers || plan.maxSubUsers,
            maxReportsDownload: maxReportsDownload || plan.maxReportsDownload,
            maxReportViewsPerDay: maxReportViewsPerDay || plan.maxReportViewsPerDay,
            maxProducts: maxProducts || plan.maxProducts,
            maxBillsCreation: maxBillsCreation || plan.maxBillsCreation,
            maxOrdersPerMonth:  maxOrdersPerMonth || plan.maxOrdersPerMonth,
            maxBarcodeScans: maxBarcodeScans || plan.maxBarcodeScans,
            maxApiCalls: maxApiCalls || plan.maxApiCalls,
            supportLevel: supportLevel || plan.supportLevel,
            status: status || plan.status,
            price: price || plan.price,
            billingCycle: billingCycle || plan.billingCycle
        });

        res.status(200).json({
            success: true,
            message: 'Plan updated successfully',
            data: plan
        });
    } catch (error) {
        // Handle specific database errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'A plan with this name already exists'
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            error: 'Error updating plan: ' + error.message
        });
    }
};

// Get API to get plans details by planId
const planById = async(req, res) => {
    const { id } = req.params;
    try {
        const plan = await Plan.findByPk(id);
        if(!plan){
        return res.status(404).json({
                status: false,
                message: "Plan not found.",
            });
        }
        return res.status(200).json({
            status: true,
            message: "Plan data found.",
            data: plan,
        });
    } catch (error) {
        console.log("Error getting plan by ID.");
        return res.status(500).json({
            status: false,
            message: "Error in getting plan by ID.", 
            error: error,
        });
    }
} 


module.exports = {
    createPlan,
    getAllActivePlans,
    updatePlan, 
    planById,
};