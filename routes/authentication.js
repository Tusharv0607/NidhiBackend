const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user')

const Token = require("../models/token");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const { body, validationResult } = require('express-validator');
const Transactions = require('../models/transactions');
const JWT_SECRET = process.env.JWTSECRET;

//------------------------------------------------------------------------------//
//Endpoint for sign up with validation using Express and MongoDB

router.post('/signUp',
  [
    body('email').isEmail(), //Checks if Email is in correct format
    body('username').isLength({ min: 5 }), //Checks the length of the Username
    body('password').isLength({ min: 5 }), //Checks the length of the Password
  ],
  async (req, res) => {

    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); //Throws error if validation fails
    }

    try {
      //Checking if the user already exists or not.
      let user = await User.findOne({ email: req.body.email } || { username: req.body.username });

      if (user) { 
        return res.status(404).json({ error: "Email or Username already exist" }) //If user already exists then throw an error
      }

      else {
        const salt = await bcrypt.genSalt(10); //Generating salt for hashing
        const hash = await bcrypt.hash(req.body.password, salt); //Hashing the password

        user = await User.create({
          username: req.body.username,
          email: req.body.email,
          password: hash, //Saving hashed password
        });

        const transactions = await Transactions.create({
           userId: user._id,
           transactions: []
        });

        const data = {
          user: {
            id: user.id
          }
        }

        const token = jwt.sign(data, JWT_SECRET); //Creating JWT token
        const username = user.username;
        const email = user.email;
        res.status(200).json({ token, username, email }) //Returning user details & token after successful registration
      }
    }
    catch (error) {
      res.status(500).json({ error: "Internal server error" }); //Returning error if something goes wrong 
    }

  });

//------------------------------------------------------------------------------//
//Endpoint for Login with validation using Express and MongoDB

router.post('/login',
  [
    body('email', 'Enter a valid email').isEmail(), //Checks if Email is in correct format
    body('password', 'Enter a valid password').exists(), //Checks if Password exists or not
  ],
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); //Throws error if validation fails
    }

    try {
      const { email, password } = req.body;

      //Finding the user using email ID
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "Input correct credentials" }); //If user doesn't exist then send error
      }
      //Comparing password with hash
      const pswrdCheck = await bcrypt.compare(password, user.password);

      if (!pswrdCheck) {
        return res.status(400).json({ error: "Input correct credentials" }); //If password does not match the hash then send error
      }
      //Fetching user id
      const data = {
        user: { id: user.id }
      }
      //Generating authentication token
      const token = jwt.sign(data, JWT_SECRET); //Creating JWT token
      const username = user.username;
      const Email = user.email;
      res.status(200).json({ token, username, Email }) //Returning user details & token after successful login
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" }); //Returning error if something goes wrong 
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