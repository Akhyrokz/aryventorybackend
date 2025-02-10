const PlanTracker = require("../model/plansTracker");

// Get API to get plan tracker based on shopkeeperId and orgId
const getPlanTracker = async(req, res) => {
    const { shopkeeperId, orgId } = req.query;
    try {
        const planTracker = await PlanTracker.findOne({
            where: {
                shopkeeperId,
                orgId,
            }
        })        
        if(!planTracker){
            return res.status(404).json({
                status: false,
                message: "Plan tracker for shopkeeper and organization not found."
            })
        }
        return res.status(200).json({
            status: true,
            message: "Plan tracker found.",
            data: planTracker
        })
    } catch (error) {
        console.log("Error in getting plan tracker.");
        return res.status(500).json({
            status: false,
            message: "Failed to get plan tracker",
            error: error,
        })
    }
}

module.exports = {
    getPlanTracker,
}