const express = require('express');
const BankDetails = require('../models/bankdetails');
const router = express.Router();
const User = require('../models/user')
const { body, validationResult } = require('express-validator');

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