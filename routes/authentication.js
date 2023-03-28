const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const JWT_SECRET = "**********";

//------------------------------------------------------------------------------//

router.post('/signUp',
  [
    body('email').isEmail(),
    body('name').isLength({ min: 3 }),
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
          name: req.body.name,
          email: req.body.email,
          password: hash,
        });

        const data = {
          user: {
            id: user.id
          }
        }

        const token = jwt.sign(data, JWT_SECRET);
        const username = user.username;
        res.status(200).json({ token , username})
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
      res.status(200).json({ token , username})
    }
    //Catching it there is an internal error
    catch (error) {
      console.log("Internal Server Error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
//------------------------------------------------------------------------------//

module.exports = router