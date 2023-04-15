const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const KYCSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user",
    },
    AccHolderName: {
        type: String,
        required: true
    },
    mobileNo: {
        type: Number,
        required: true,
    },
    PAN: {
        type: String,
        required: true
    },
    Aadhar: {
        type: String,
        required: true
    },

});

module.exports = mongoose.model('kyc', KYCSchema);