const express = require('express');
const router = express.Router();
const fetchUser = require('../middleware/fetchUser');
const User = require('../models/user')
const Transactions = require('../models/transactions');
const BankDetails = require('../models/bankdetails');
const { body, validationResult } = require('express-validator');

//------------------------------------------------------------------------------//

router.post('/addBankDetails',
    fetchUser,               //Validating login using middleware
    [

        body('AccHolderName', 'Enter a valid name').isLength({ min: 3 }),
        body('AccountNo', 'Enter a valid acc no.').isLength({ min: 10 }),
        body('BankName', 'enter a valid name').isLength({ min: 2 }),
        body('IFSC', 'IFSC invalid').isLength({ min: 4 }),
        body('Type', 'Please select your bank account type').isLength({ min: 7 })
    ],
    async (req, res) => {
        try {
            //Fetching errors of validation
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            //Creating new note
            const { AccHolderName, BankName, AccountNo, IFSC, Type } = req.body;
            const details = new BankDetails({
                userId: req.user.id,
                AccHolderName,
                BankName,
                AccountNo,
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

router.get('/balanceStatus',
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

module.exports = router;