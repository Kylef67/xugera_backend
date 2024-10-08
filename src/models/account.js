const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
}, { timestamps: true });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
