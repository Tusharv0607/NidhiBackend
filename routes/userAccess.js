const express = require('express');
const router = express.Router();
const fetchUser = require('../middleware/fetchUser');
const User = require('../models/user')
const Transactions = require('../models/transactions');
const BankDetails = require('../models/bankdetails');
const WithdrawRequest = require('../models/withdrawRequest');
const Beneficiaries = require('../models/beneficiary');
const { body, validationResult } = require('express-validator');

//------------------------------------------------------------------------------//

router.post('/addBankDetails',
  fetchUser,               //Validating login using middleware
  [
    body('userId', 'Invalid ID').isLength({ min: 8 }),
    body('AccHolderName', 'Enter a valid name').isLength({ min: 3 }),
    body('MobileNo', "Invalid Mobile Number").isLength({min: 10}),
    body('AccountNo', 'Enter a valid acc no.').isLength({ min: 10 }),
    body('Address', "Enter correct address").isLength({min: 3}),
    body('ZIP', "Enter a correct postal code").isLength(6),
    body('BankName', 'enter a valid bank name').isLength({ min: 2 }),
    body('BranchName', 'enter a valid branch name').isLength({ min: 2 }),
    body('IFSC', 'IFSC invalid').isLength({ min: 4 }),
    body('Type', 'Please select your bank account type').isLength({ min: 7 })
  ],
  async (req, res) => {
    try
    {
      //Fetching errors of validation
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, AccHolderName, MobileNo, Address, State, ZIP, BankName, BranchName, AccountNo, IFSC, Type } = req.body;

      const details = new BankDetails({
        userId,
        AccHolderName,
        MobileNo,
        AccountNo,
        Address,
        State,
        ZIP,
        BankName,
        BranchName,
        IFSC,
        Type
      })

      await details.save();
      res.status(200).json('Details added successfully');
    }
    //Catching it there is an internal error
    catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  
//------------------------------------------------------------------------------//
// Route that handles GET bank details of individual user

router.post('/getBankDetails',
fetchUser, // Middleware that authenticates and fetches user data
[
  body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
],
async (req, res) => {
  try
   {
    const userId = req.body.userId; // Extracting user ID from request body

    const details = await BankDetails.findOne({ userId }); // Finding details associated with the user

    if (details) { // If details are found, return them in the response
      return res.status(200).json(details);
    }

    res.status(404).json({ error: "Details Not Added Yet.." }); // Otherwise, return a 404 error indicating no details were added
  }
  // // Catch block to handle errors
  catch (error) {
    console.log("Error:", error.message); // Log the error message to the console for debugging purposes
    res.status(500).json({ error: "Internal Server error" }); // Return a 500 error indicating there was an internal server error
  }
});

//------------------------------------------------------------------------------//

router.post('/balanceStatus',
  fetchUser, // Middleware function to verify if the user is an admin
  [
    body('email', 'Enter a valid email').isEmail(), // Validates if Email is of correct format      
  ],
  async (req, res) => {
    try {
      // Validate request parameters using express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) { //If there are any validation errors return bad request error response
        return res.status(400).json({ errors: errors.array() });
      }

      // Extracts email and amount from request body
      const { email } = req.body;

      // Finds user with given email
      const user = await User.findOne({ email });

      // Returns error response if user not found
      if (!user) {
        return res.status(400).json({ error: "Input correct crediantials" }); //return error response when user not found
      }

      // Finds transaction record associated with the user id and updates the allotted amount
      const userId = user._id; //get the user Id of current user
      const transaction = await Transactions.findOne({ userId }) //find transactions record for this user id

      const data = {
        allotedAmt: transaction.allotedAmt,
        lockedAmt: transaction.lockedAmt,
        availToWithdraw: transaction.availToWithdraw, //get different types of amount from transaction record
        disburseAmt: transaction.disbursedAmt
      }

      // Returns success response with amounts details
      res.status(200).json(data);
    }
    catch (error) {
      console.error(error.message);

      // Returns error response for internal server error
      res.status(500).json({ error: "Internal Server Error" }); //return error response if there is any internal server error
    }
  });

//------------------------------------------------------------------------------//

router.post(
  '/requestWithdraw',
  fetchUser,
  [
    // Validating user ID and amount parameters
    body('userId', 'Invalid ID').isLength({ min: 8 }),
    body('amount', "Enter a valid amount").isNumeric()
  ],

  async (req, res) => {
    try {
      const { userId, amount } = req.body;

      // Validate request parameters using express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() }); //If there are any validation errors return bad request error response
      }

      // Checking if user exists and is not blocked
      const transaction = await Transactions.findOne({ userId });
      if (!transaction) {
        return res.status(400).json({ error: "Input a valid user ID" });
      }
      if (transaction.isBlocked) {
        return res.status(400).json({ error: "User is blocked. Can't request withdrawal..." });
      }

      // Checking if bank details exist for user
      const bankdetails = await BankDetails.findOne({ userId });
      if (!bankdetails) {
        return res.status(404).json({ error: "Bank Details Not Added, Can't Proceed Further..." });
      }

      // Checking if user has sufficient balance for requested amount
      if (amount > transaction.availToWithdraw) {
        return res.status(400).json({ error: "Insufficient Balance. Can't Withdraw" });
      }

      // Checking if there is already a pending request
      const withdraw = await WithdrawRequest.findOne({ userId });
      if (withdraw) {
        return res.status(400).json({ error: "A request is already pending. Can't add up more..." });
      }

      // Creating withdrawal request and returning success response with result
      const withdrawRequest = await WithdrawRequest.create({
        userId,
        amount,
      });

      res.status(200).json(withdrawRequest);
    }
    catch (error) {
      console.error(error.message);

      // Returns error response for internal server error
      res.status(500).json({ error: "Internal Server Error" }); //return error response if there is any internal server error
    }
  }
);

//------------------------------------------------------------------------------//
// Route that handles POST requests to add a beneficiary

router.post('/addBeneficiary',
  fetchUser, // Middleware that authenticates and fetches user data
  [
    // Body validation middleware for various fields - checks if they meet specified length or numeric criteria
    body('userId', 'Invalid user ID').isLength({ min: 10 }),
    body('BeneficiaryName', 'Enter a valid name').isLength({ min: 3 }),
    body('MobileNo', 'Enter a valid no').isNumeric().isLength(10),
    body('Address', 'Enter a valid address').isLength({ min: 3 }),
    body('State', 'Invalid Name').isLength({ min: 2 }),
    body('ZIP', 'Enter a valid zip code').isNumeric().isLength(6),
    body('AccountNo', 'Enter a valid acc no.').isLength({ min: 10 }),
    body('BankName', 'Enter a valid bank name').isLength({ min: 2 }),
    body('BranchName', 'Enter a valid branch name').isLength({ min: 2 }),
    body('IFSC', 'IFSC invalid').isLength({ min: 4 }),
    body('Type', 'Please select your bank account type').isLength({ min: 7 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req); // Validation errors from body validation middleware
      if (!errors.isEmpty()) { // If there are errors, return them in response with 400 status code
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, BeneficiaryName, MobileNo, AccountNo, Address, State, ZIP, BankName, BranchName, IFSC, Type } = req.body; // Extraction of beneficiary data from request body

      const beneficiary = { BeneficiaryName, MobileNo, AccountNo, Address, State, ZIP, BankName, BranchName, IFSC, Type }; // Creation of new beneficiary object from extracted data

      let benef = await Beneficiaries.findOne({ userId }); // Check if there is already a beneficiary associated with the user
      if (!benef) { // If there isn't, create one and add the new beneficiary to it
        benef = await Beneficiaries.create({
          userId,
          beneficiaries: [beneficiary]
        });
      }
      else { // Otherwise, add the new beneficiary to the existing list of beneficiaries
        await Beneficiaries.findOneAndUpdate(
          { userId },
          { $push: { beneficiaries: beneficiary } }
        );
      }
      res.status(200).json("Details added successfully"); // Return a success message in response with 200 status code
    }
    catch (error) {
      res.status(500).json({ error: "Internal Server Error" }); // Return a 500 error indicating there was an internal server error
    }
  });

//------------------------------------------------------------------------------//
// Route that handles GET requests for beneficiaries

router.get('/getBeneficiaries',
  fetchUser, // Middleware that authenticates and fetches user data
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

router.get('/getTransactions',
  fetchUser, // Middleware that authenticates and fetches user data
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try 
    {
      const userId = req.body.userId; // Extracting user ID from request body

      const transacs = await Transactions.findOne({ userId }); // Finding transactions associated with the user

      if (transacs) { // If transactions are found, return them in the response
        return res.status(200).json(transacs.transactions);
      }

      res.status(404).json({ error: "No Transactions Available to show..." }); // Otherwise, return a 404 error indicating no transactions were found
    }
    // Catch block to handle errors
    catch (error) {
      console.log("Error:", error.message); // Log the error message to the console for debugging purposes
      res.status(500).json({ error: "Internal Server error" }); // Return a 500 error indicating there was an internal server error
    }
  });

//------------------------------------------------------------------------------//

module.exports = router;
