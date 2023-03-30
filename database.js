const mongoose = require('mongoose');
require("dotenv").config();

const mongoURI = process.env.DB;

const connect = () => {
    mongoose.set('strictQuery', false)
    mongoose.connect(mongoURI, () => {
        console.log("Connected with Mongo Successfully");
    });
}

module.exports = connect;