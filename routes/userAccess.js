const express = require('express');
const router = express.Router();
const fetchUser = require('../middleware/fetchUser');
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
            const { AccHolderName,BankName, AccountNo, IFSC, Type } = req.body;
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

module.exports = router;