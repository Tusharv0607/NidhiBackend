const express = require('express');
const BankDetails = require('../models/bankdetails');
const verifyAdmin = require('../middleware/verifyAdmin.js')
const router = express.Router();
const User = require('../models/user')
const WithdrawRequest = require('../models/withdrawRequest')
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator')
const Transactions = require('../models/transactions');
require("dotenv").config();
const JWT_SECRET = process.env.JWTSECRET;

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

      if (email != process.env.ADMINEMAIL || password != process.env.ADMINPASSWORD) {
        return res.status(404).json({ error: "Input correct credentials" }); //If user doesn't exist then send error
      }

      //Generating authentication token
      const token = jwt.sign(email, JWT_SECRET); //Creating JWT token
      res.status(200).json({ token }) //Returning user details & token after successful login
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" }); //Returning error if something goes wrong 
    }
  });
//------------------------------------------------------------------------------//
router.get('/getAll',
  verifyAdmin,
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
  verifyAdmin,
  [
    body('email', 'Enter a valid email').isEmail(), //Checks if Email is in correct format
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
      const user = await User.findOne({ email });

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

router.put('/blockUser',
  verifyAdmin,
  [
    body('email', 'Enter a valid email').isEmail(), //Checks if Email is in correct format    
  ],
  async (req, res) => {
    //Fetching errors of validation
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ error: "Input correct crediantials" });
      }

      const userId = user._id;
      const transaction = await Transactions.findOneAndUpdate({ userId }, { isBlocked: true }, { new: true })
      res.status(200).json("updates");
    }
    catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
//------------------------------------------------------------------------------//
// Defines a PUT route for editing allotted amount of user account
router.put('/editAllotedAmt',
  verifyAdmin, // Middleware function to verify if the user is an admin
  [
    body('email', 'Enter a valid email').isEmail(), //Checks if Email is in correct format    
    body('amount', 'Enter a valid number').isNumeric(), //Checks if entered amount is numeric    
  ],
  async (req, res) => {

    // Validate request parameters using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Extracts email and amount from request body
      const { email, amount } = req.body;

      // Finds user with given email
      const user = await User.findOne({ email });

      // Returns error response if user not found
      if (!user) {
        return res.status(400).json({ error: "Input correct crediantials" });
      }

      // Finds transaction record associated with the user id and updates the allotted amount
      const userId = user._id;
      const transaction = await Transactions.findOneAndUpdate({ userId }, { allotedAmt: amount }, { new: true })

      // Calculates available balance for withdrawal based on allotted amount, locked amount and disbursed amount
      const availToWithdraw = transaction.allotedAmt - transaction.lockedAmt - transaction.disbursedAmt;

      // Updates the available balance for withdrawal in the transaction record
      await Transactions.findOneAndUpdate({ userId }, { availToWithdraw: availToWithdraw }, { new: true });

      // Returns success response
      res.status(200).json("ammount updated");
    }
    catch (error) {
      console.error(error.message);

      // Returns error response for internal server error
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


//------------------------------------------------------------------------------//
// Defines a PUT route for editing locked amount of user account

router.put('/editLockedAmt',
  verifyAdmin, // Middleware function to verify if the user is an admin
  [
    body('email', 'Enter a valid email').isEmail(), //Checks if Email is in correct format    
    body('amount', 'Enter a valid number').isNumeric(), //Checks if entered amount is numeric    
  ],
  async (req, res) => {

    // Validate request parameters using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Extracts email and amount from request body
      const { email, amount } = req.body;

      // Finds user with given email
      const user = await User.findOne({ email });

      // Returns error response if user not found
      if (!user) {
        return res.status(400).json({ error: "Input correct crediantials" });
      }

      // Finds transaction record associated with the user id and updates the locked amount
      const userId = user._id;
      const transaction = await Transactions.findOneAndUpdate({ userId }, { lockedAmt: amount }, { new: true });

      // Calculates available balance for withdrawal based on allotted amount, locked amount and disbursed amount
      const availToWithdraw = transaction.allotedAmt - transaction.lockedAmt - transaction.disbursedAmt;

      // Updates the available balance for withdrawal in the transaction record
      await Transactions.findOneAndUpdate({ userId }, { availToWithdraw: availToWithdraw }, { new: true });

      // Returns success response
      res.status(200).json("ammount updated");
    }
    catch (error) {
      console.error(error.message);

      // Returns error response for internal server error
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

//------------------------------------------------------------------------------//
// Route that handles GET requests for beneficiaries

router.get('/getBeneficiaries',
  verifyAdmin, // Middleware that authenticates admin
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try {
      const userId = req.body.userId; // Extracting user ID from request body

      const benefs = await Beneficiaries.findOne({ userId }); // Finding beneficiaries associated with the user

      if (benefs) { // If beneficiaries are found, return them in the response
        return res.status(200).json(benefs.beneficiaries);
      }

      res.status(404).json({ error: "No beneficiaries added" }); // Otherwise, return a 404 error indicating no beneficiaries were found
    }
    // Catch block to handle errors
    catch (error) {
      console.log("Error:", error.message); // Log the error message to the console for debugging purposes
      res.status(500).json({ error: "Internal Server error" }); // Return a 500 error indicating there was an internal server error
    }
  });

//------------------------------------------------------------------------------//
router.get('/getAllRequests',
  verifyAdmin,
  async (req, res) => {
    //Getting user details after login
    try {
      let requests = await WithdrawRequest.find({});
      res.send(requests);
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Error");
      res.status(500).json({ error: "Internal Server error" });
    }
  });

//------------------------------------------------------------------------------//
router.post('/handleWithdrawRequest',
  verifyAdmin,
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 })
  ],
  async (req, res) => {
    try {
      const { userId } = req.body;

      const [withRequest, transact] = await Promise.all([
        WithdrawRequest.findOne({ userId }),
        Transactions.findOne({ userId })
      ]);

      if (!withRequest) {
        return res.status(404).json("No withdraw request for the user at this moment");
      }

      const newDisbursed = withRequest.amount + transact.disbursedAmt;
      const newAvail = transact.availToWithdraw - newDisbursed;

      const newTransact = { 
        amount: withRequest.amount, 
        status: "Processed" 
      }

      const updatedTransact = await Transactions.findOneAndUpdate(
        { userId },
        { availToWithdraw: newAvail, disbursedAmt: newDisbursed, $push: { transactions: newTransact }},
        { new: true }
      );
      
      await WithdrawRequest.findOneAndDelete({userId});

      res.status(200).json(updatedTransact);
    }
    catch (error) {
      console.log("Error:", error.message);
      res.status(500).json({ error: "Internal Server error" });
    }
  });

//------------------------------------------------------------------------------//

module.exports = router