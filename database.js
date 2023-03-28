const mongoose = require('mongoose');
const mongoURI = ('mongodb+srv://TusharV:987654321@cluster0.h6oli1k.mongodb.net/test')

const connect = () => {
    mongoose.set('strictQuery', false)
    mongoose.connect(mongoURI, () => {
        console.log("Connected with Mongo Successfully");
    });
}

module.exports = connect;