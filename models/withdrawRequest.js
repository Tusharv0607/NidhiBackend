const { Schema, model } = require("mongoose");

const withdrawalSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: "Processing"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = model("Withdrawal", withdrawalSchema);

