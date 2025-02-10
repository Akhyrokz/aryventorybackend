const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ error: "Token is missing" });
  }
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from headers

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid token or Expired Token." });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
