const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bankdSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user",
    },
    AccHolderName: {
        type: String,
        required: true
    },
    BankName: {
        type: String,
        required: true,
    },

    AccountNo: {
        type: String,
        unique: true,
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
});

module.exports = mongoose.model("bankdetails", bankdSchema);