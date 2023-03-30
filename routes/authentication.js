const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user')

const Token = require("../models/token");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const Joi = require("joi");

const { body, validationResult } = require('express-validator');
const JWT_SECRET = "**********";

//------------------------------------------------------------------------------//

router.post('/signUp',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 5 }),
  ],
  async (req, res) => {

    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      //Checking if the user already exist or not.
      let user = await User.findOne({ email: req.body.email });

      if (user) {
        return res.status(404).json({ error: "Email already exist" })
      }

      else {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);

        user = await User.create({
          email: req.body.email,
          password: hash,
        });

        const data = {
          user: {
            id: user.id
          }
        }

        const token = jwt.sign(data, JWT_SECRET);
        res.status(200).json({ token})
      }
    }
    catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }

  });
//------------------------------------------------------------------------------//

router.post('/login',
  [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Enter a valid password').exists(),
  ],
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      //Finding the user using email ID
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "Input correct crediantials" });
      }
      //Comparing password with hash
      const pswrdCheck = await bcrypt.compare(password, user.password);

      if (!pswrdCheck) {
        return res.status(400).json({ error: "Input correct crediantials" });
      }
      //Fetchin user id
      const data = {
        user: { id: user.id }
      }
      //Generating authentication token
      const token = jwt.sign(data, JWT_SECRET);
      const username = user.username;
      res.status(200).json({ token, username })
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


//------------------------------------------------------------------------------//

router.post('/reset',
  [
    body('email', 'Enter a valid email').isEmail()
  ],
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;

      //Finding the user using email ID
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "Input correct crediantials" });
      }

      let token = await Token.findOne({ userId: user._id });
      if (!token) {
        token = await new Token({
          userId: user._id,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
      }

      const link = `${process.env.BASE_URL}/password-reset/${user._id}/${token.token}`;
      await sendEmail(user.email, "Password reset", link);

      res.send("password reset link sent to your email account");

    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
//------------------------------------------------------------------------------//

router.post('password-reset/:userId/:token',
  [
    body('password').isLength({ min: 5 }),
  ],
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(400).send("invalid link or expired");

      const token = await Token.findOne({
        userId: user._id,
        token: req.params.token,
      });

      if (!token) return res.status(400).send("Invalid link or expired");

      user.password = req.body.password;
      await user.save();
      await token.delete();

      res.send("password reset sucessfully.");

    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
//------------------------------------------------------------------------------//

module.exports = router