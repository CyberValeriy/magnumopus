const express = require("express");
const { body } = require("express-validator/check");
const User = require("../models/user");
const authController = require("../controllers/auth");
const router = express.Router();

router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom(async (value, { req }) => {
        const user = await User.findOne({ email: value });
        if (user) {
          return new Error("E-mail adress is already exist");
        }
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);

router.post("/login", authController.logIn); //without validation

module.exports = router;
