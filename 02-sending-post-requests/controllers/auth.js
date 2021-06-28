const User = require("../models/user");
const { validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ message: errors.array() }).status(422);
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return res.json({ message: err }).status(500);
  }
  let user;
  try {
    user = await new User({
      email: email,
      name: name,
      password: hashedPassword,
    }).save();
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  res.status(200).json({ message: "User was created!", userId: user._id });
};

exports.logIn = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  if (!user) {
    return res.status(404).json({ message: new Error("Cannot find user!") });
  }

  let isEqual;
  try {
    isEqual = await bcrypt.compare(password, user.password);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  if (!isEqual) {
    return res.status(404).json({ message: new Error("Incorrect password") });
  }
  const token = jwt.sign(
    {
      email: email,
      userId: user._id.toString(),
    },
    "ultramegasecret",
    { expiresIn: "1h" }
  );
  res.status(200).json({ token: token, userId: user._id.toString() });
};
