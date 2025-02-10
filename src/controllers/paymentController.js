const Razorpay = require("razorpay");
require("dotenv").config();
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const User = require("../model/user");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
const createOrder = async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `order_rcptid_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    return res
      .status(200)
      .json({ order: order, razorpayKey: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    if (error.response) {
      console.error("Razorpay API Error:", error.response.data);
    } else {
      console.error("Error creating Razorpay order:", error.message);
    }
    return res
      .status(500)
      .json({ error: "Failed to create an order. Please try again." });
  }
};

const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    newPlanId,
    billingCycle,
  } = req.body;

  const secret = razorpay.key_secret;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );
    if (isValidSignature) {
      const user = await User.findByPk(userId);
      user.current_plan_id = newPlanId;
      const sub_start_date = new Date();
      user.subscription_start_date = new Date(sub_start_date);
      const sub_end_date = new Date(sub_start_date);
      switch (billingCycle) {
        case "Monthly":
          sub_end_date.setMonth(sub_start_date.getMonth() + 1);
          break;
        case "Quarterly":
          sub_end_date.setMonth(sub_start_date.getMonth() + 3);
          break;
        case "Half-Yearly":
          sub_end_date.setMonth(sub_start_date.getMonth() + 6);
          break;
        case "Yearly":
          sub_end_date.setFullYear(sub_start_date.getFullYear() + 1);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid billing cycle.",
          });
      }
      sub_end_date.setHours(23, 59, 59, 999);
      console.log(sub_start_date);
      console.log(sub_end_date);
      user.subscription_end_date = sub_end_date;
      user.plan_status = "active";
      user.plan_upgrade_date = sub_start_date;
      user.last_payment_date = sub_start_date;
      user.next_billing_date = sub_end_date;

      const isSamePlan = user.current_plan_id === newPlanId;
      user.is_plan_renewed = isSamePlan;

      await user.save();

      return res.status(200).json({
        status: "ok",
        message: "Payment verification successful. Plan upgraded successfully.",
      });
    } else {
      console.log("Payment verification failed");
      return res.status(400).json({ status: "verification_failed" });
    }
  } catch (error) {
    console.error("Error > paymentController > verifyPayment:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Error verifying payment" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
