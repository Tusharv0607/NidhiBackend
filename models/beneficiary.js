const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const beneficiarySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user",
    },
    beneficiaries: [{
        BeneficiaryName: {
            type: String,
            required: true
        },
        MobileNo: {
            type: Number,
            required: true
        },
        AccountNo: {
            type: String,
            unique: true,
            required: true,
        },
        Address: {
            type: String,
            required: true
        },
        State: {
            type: String,
            required: true
        },
        ZIP: {
            type: Number,
            required: true
        },
        BankName: {
            type: String,
            required: true,
        },
        BranchName: {
            type: String,
            required: true,
        },
        IFSC: {
            type: String,
            unique: true,
            required: true,
        },
        Type: {
            type: String,
            required: true
        }
    }],
});

module.exports = mongoose.model("beneficiary", beneficiarySchema);