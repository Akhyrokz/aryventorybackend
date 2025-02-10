const Feedback = require("../model/feedback");
const submitFeedback = async (req, res) => {
  try {
    const { userId, userType, feedback, rating } = req.body;

    // Input validation
    if (!userId || !userType || !feedback || !rating) {
      return res.status(400).json({
        message: "User ID, userType, feedback, and rating are required.",
      });
    }

    // Validate userType
    if (
      !["Shopkeeper", "Supplier", "Manager", "SalesPerson"].includes(userType)
    ) {
      return res.status(400).json({
        message:
          "Invalid userType. Allowed values: 'Shopkeeper', 'Supplier', 'Manager', 'SalesPerson'.",
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5." });
    }

    // Create feedback
    const newFeedback = await Feedback.create({
      userId,
      userType,
      feedback,
      rating,
    });

    return res
      .status(201)
      .json({ message: "Feedback submitted successfully!", data: newFeedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
module.exports = {
  submitFeedback,
};
