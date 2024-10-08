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
    },
    get: async (req, res) => {
        try {
            const transaction = await Transaction.findById(req.params.id);
            res.json(transaction)
        } catch (error) {
            res.status(500).json(error)
        }
    },
    update: async (req, res) => {
        try {
            const account = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json(account);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    delete: async (req, res) => {
        try {
            const account = await Transaction.findByIdAndDelete(req.params.id);
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json({ message: 'Account deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}