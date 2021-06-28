const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: new Error("Not authenticated.") });
  }
  const token = req.get("Authorization").split(" ")[1];
  let verificatedToken;
  try {
    verificatedToken = jwt.verify(token, "ultramegasecret");
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  if (!verificatedToken) {
    return res.status(401).json({ message: new Error("Verification error!") });
  }
  req.userId = verificatedToken.userId;
  next();
};
