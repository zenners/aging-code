const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {},
  { strict: false, timestamps: true }
);

module.exports = mongoose.model("Account", AccountSchema);
