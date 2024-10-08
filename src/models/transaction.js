const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionDate: {
        type: Date,
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }

})

const Transaction = mongoose.model('Transaction' , transactionSchema);

module.exports = Transaction