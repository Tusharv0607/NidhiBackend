const express = require('express');
const BankDetails = require('../models/bankdetails');
const router = express.Router();
const User = require('../models/user')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const JWT_SECRET = "**********";
require("dotenv").config();

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

      //Verifying Crediantials

      if (email!=process.env.ADMINEMAIL || password!=process.env.ADMINPASSWORD) {
        return res.status(404).json({ error: "Input correct credentials" }); //If user doesn't exist then send error
      }
 
      //Generating authentication token
      const token = jwt.sign(email, JWT_SECRET); //Creating JWT token
      res.status(200).json({ token}) //Returning user details & token after successful login
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" }); //Returning error if something goes wrong 
    }
  });
//------------------------------------------------------------------------------//
router.get('/getAll',

  async (req, res) => {
    //Getting user details after login
    try {
      let users = await User.find({});
      res.send(users);
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Error");
      res.status(500).json({ error: "Internal Server error" });
    }
  });
//------------------------------------------------------------------------------//

router.post('/getBankDetails',
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userID } = req.body;
      _id = userID
      //Finding the user using email ID
      const user = await User.findOne({ _id });

      if (!user) {
        return res.status(404).json({ error: "Input correct crediantials" });
      }

      const details = await BankDetails.findOne({ userId: user._id });
      res.send(details);

    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
//------------------------------------------------------------------------------//

module.exports = router