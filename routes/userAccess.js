const express = require('express');
const router = express.Router();
const fetchUser = require('../middleware/fetchUser');
const User = require('../models/user')
const Transactions = require('../models/transactions');
const BankDetails = require('../models/bankdetails');
const WithdrawRequest = require('../models/withdrawRequest');
const Beneficiaries = require('../models/beneficiary');
const { body, validationResult } = require('express-validator');
const UserKYC = require('../models/userKYC');
const transactions = require('../models/transactions');
const withdrawRequest = require('../models/withdrawRequest');

//------------------------------------------------------------------------------//
// Endpoint for updating bank details
router.put('/updateBankDetails',
  // Middleware for validating login
  fetchUser,
  [
    // Request body validation checks using 'express-validator' library
    body('userId', 'Invalid ID').isLength({ min: 8 }),
    body('AccHolderName', 'Enter a valid name').isLength({ min: 3 }),
    body('MobileNo', "Invalid Mobile Number").isLength({ min: 10 }),
    body('AccountNo', 'Enter a valid acc no.').isLength({ min: 6 }),
    body('Address', "Enter correct address").isLength({ min: 3 }),
    body('ZIP', "Enter a correct postal code").isLength(6),
    body('BankName', 'enter a valid bank name').isLength({ min: 2 }),
    body('BranchName', 'enter a valid branch name').isLength({ min: 2 }),
    body('IFSC', 'IFSC invalid').isLength({ min: 4 }),
    body('Type', 'Please select your bank account type').isLength({ min: 4 })
  ],
  async (req, res) => {
    try {
      // Validating request inputs and fetching any errors with the request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      // Destructuring request body 
      const {
        userId,
        AccHolderName,
        MobileNo,
        Address,
        State,
        ZIP,
        BankName,
        BranchName,
        AccountNo,
        IFSC,
        Type
      } = req.body;

      // Updating the bank details in the database
      const details = await BankDetails.findOneAndUpdate(
        { userId }, // Query for finding bank details of the user
        { // New bank details to be updated in database
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
        },
        { upsert: true, new: true } // Options for returning the updated document instead of the original one
      ).exec();

      // If no bank details were found for the user, return an error response
      if (!details) {
        return res.status(404).json({ error: "Bank details not found" });
      }

      // Return success response
      res.status(200).json('Details updated successfully');
    } catch (error) {
      // Catching any internal server errors and returning the error response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

//------------------------------------------------------------------------------//
// Route that handles GET bank details of individual user

router.post('/getBankDetails',
  fetchUser, // Middleware that authenticates and fetches user data
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try {
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
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try {
      // Validate request parameters using express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) { //If there are any validation errors return bad request error response
        return res.status(400).json({ errors: errors.array() });
      }

      // Extracts userId from body
      const { userId } = req.body;

      const transaction = await Transactions.findOne({ userId }) //find transactions record for this user id

      // Returns error response if user not found
      if (!transaction) {
        return res.status(400).json({ error: "Input correct crediantials" }); //return error response when transactions not found
      }

      const data = {
        allotedAmt: transaction.allotedAmt,
        lockedAmt: transaction.lockedAmt,
        availToWithdraw: transaction.availToWithdraw, //get different types of amount from transaction record
        disburseAmt: transaction.disbursedAmt
      }

      // Returns success response with amount details
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
    body('userId', 'Invalid ID').isLength({ min: 8 })
  ],

  async (req, res) => {
    try {
      const { userId } = req.body;

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

      if(transaction.availToWithdraw<=0){
        return res.status(400).json({ error: "You have no available balance to withdraw" });
      }
      // Checking if bank details exist for user
      const bankdetails = await BankDetails.findOne({ userId });

      if (!bankdetails) {
        return res.status(404).json({ error: "Bank Details Not Added, Can't Proceed Further..." });
      }

      // Checking if there is already a pending request
      const withdraw = await WithdrawRequest.findOne({ userId });
      if (withdraw) {
        return res.status(400).json({ error: "A request is already pending. Can't add up more..." });
      }

      // Creating withdrawal request and returning success response with result
      const withdrawRequest = await WithdrawRequest.create({
        userId,
        amount: transaction.availToWithdraw,
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
// Endpoint for updating KYC details

router.put('/updateKYC',
  // Middleware for validating login
  fetchUser,
  [
    // Request body validation checks using 'express-validator' library
    body('userId', 'Invalid ID').isLength({ min: 8 }),
    body('AccHolderName', 'Invalid Name').isLength({ min: 2 }),
    body('MobileNo', 'Enter a valid name').isLength(10),
    body('PAN', "Invalid PAN No.").isLength(10),
    body('Aadhar', "Invalid Aadhar No.").isLength(12),
  ],
  async (req, res) => {
    try {
      // Validating request inputs and fetching any errors with the request
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Destructuring request body 
      const {
        userId,
        AccHolderName,
        MobileNo,
        PAN,
        Aadhar
      } = req.body;

      // Updating the bank details in the database
      const KYCDetails = await UserKYC.findOneAndUpdate(
        { userId }, // Query for finding KYC details of the user
        { // New KYC details to be updated in database
          AccHolderName,
          MobileNo,
          PAN,
          Aadhar
        },
        { upsert: true, new: true },
      ).exec();

      // Return success response
      res.status(200).json('KYC details updated successfully');
    }
    catch (error) {
      // Catching any internal server errors and returning the error response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

//------------------------------------------------------------------------------//
// Route that handles GET requests for users KYC details

router.post('/getKycDetails',
  fetchUser, // Middleware that authenticates and fetches user data
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try {
      const userId = req.body.userId; // Extracting user ID from request body

      const kycDets = await UserKYC.findOne({ userId }); // Finding KYC details associated with the user

      if (kycDets) { // If details are found, return them in the response
        return res.status(200).json(kycDets);
      }

      res.status(404).json({ error: "KYC not updated" }); // Otherwise, return a 404 error indicating no details added
    }
    // Catch block to handle errors
    catch (error) {
      console.log("Error:", error.message); // Log the error message to the console for debugging purposes
      res.status(500).json({ error: "Internal Server error" }); // Return a 500 error indicating there was an internal server error
    }
  });

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

router.post('/getBeneficiaries',
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

router.post('/getTransactions',
  fetchUser, // Middleware that authenticates and fetches user data
  [
    body('userId', 'Invalid user ID').isLength({ min: 10 }) // Body validation middleware that checks if userId is at least 10 characters long
  ],
  async (req, res) => {
    try {
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
router.delete('/deleteUser',
  fetchUser, // Middleware that authenticates and fetches user data
  [ // Body validation middleware that checks if userId is at least 10 characters long
    body('userId', 'Invalid user ID').isLength({ min: 10 })
  ],
  async (req, res) => {
    try {
      const { userId } = req.body; // Destructuring from request body

      // Using Promise.all() to perform all delete operations in parallel.
      await Promise.all([
        transactions.findOneAndDelete({ userId }),
        UserKYC.findOneAndDelete({ userId }),
        BankDetails.findOneAndDelete({ userId }),
        withdrawRequest.findOneAndDelete({ userId }),
        Beneficiaries.findOneAndDelete({ userId }),
        User.findByIdAndDelete(userId)
      ]);

      res.status(200).json({ message: "User deleted successfully" }); // Return a success message indicating the user was successfully deleted
    }
    // Catch block to handle errors
    catch (error) {
      console.log("Error:", error.message); // Log the error message to the console for debugging purposes
      res.status(500).json({ error: "Internal Server error" }); // Return a 500 error indicating there was an internal server error
    }
  }
);

//------------------------------------------------------------------------------//

module.exports = router;
