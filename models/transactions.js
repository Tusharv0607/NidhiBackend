const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user",
        unique: true // Add unique index
    },
    bankDetailsAdded: {
        type: Boolean,
        required: true,
        default: false
    },
    isBlocked: {
        type: Boolean,
        required: true,
        default: false
    },
    allotedAmt: {
        type: Number,
        default: 0
    },
    lockedAmt: {
        type: Number,
        default: 0
    },
    disbursedAmt: {
        type: Number,
        default: 0
    },
    availToWithdraw: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            createdAt: {
                type: Date,
                default: Date.now
            },
            amount: {
                type: Number,
                default: 0
            },
            status: {
                type: String,
                required: true,
                default: "Processing"
            }
        }
    ]
});

module.exports = mongoose.model("transactions", transactSchema);
