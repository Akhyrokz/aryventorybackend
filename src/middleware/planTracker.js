const PlanTracker = require('../model/plansTracker');
const Plan = require('../model/Plan');
const User = require("../model/user");

const checkLimit = async (req, res, next) => {
    let {orgId, countColumn, maxCountColumn}=req.query;
    
    if(!orgId){
       orgId = req?.params?.orgId;     
    }

    try {
        const planTrackerWithPlan = await PlanTracker.findOne({
            where: {
                orgId,
            },
            include: [
                {
                    model: User,
                    as: "PlanTrackerShopkeeper",
                    attributes: ["current_plan_id"],
                    include: {
                        model: Plan,
                        as: "CurrentPlan",
                        attributes: [maxCountColumn],
                    },
                },
            ],
        });

        let countCreation = planTrackerWithPlan[countColumn];
        let maxCreation = planTrackerWithPlan.PlanTrackerShopkeeper.CurrentPlan[maxCountColumn];

        if (countCreation >= maxCreation) {
            return res
                .status(403)
                .json({
                    message: "You have reached your limit.",
                });
        }else{
            req.planTracker=planTrackerWithPlan;
            next();
        }
    } catch (error) {
        console.log("error while checking restriction : middleware > restrictions : 40", error.message);
        return res.status(500).json({ message: 'internal server error' });
    }
}
module.exports = {checkLimit};