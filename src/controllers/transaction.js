const Transaction = require('../models/transaction');

module.exports = {
    post: async (req, res) => {
        try {
            const transaction = new Transaction(req.body)
            transaction.save();
            res.status(201).json(transaction)
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    },
    all: async (req, res) => {
        try {
            const transactions = await Transaction.find().populate('account');
            res.json(transactions);
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
}