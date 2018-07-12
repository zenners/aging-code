const mongoose = require("mongoose");

const LedgerSchema = new mongoose.Schema(
  {},
  { strict: false, timestamps: true }
);

module.exports = mongoose.model("Ledger", LedgerSchema);
