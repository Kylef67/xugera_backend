const Account = require('../models/account')

module.exports = {
    post: async (req, res) => {
        try {
            const account = new Account(req.body);
            await account.save();
            res.status(201).json(account);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    get: async (req, res) => {
        try {
            const account = await Account.findById(req.params.id);
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json(account);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    all: async (req, res) => {
        try {
            const accounts = await Account.find();
            res.json(accounts);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    update: async (req, res) => {
        try {
            const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json(account);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    delete: async (req, res) => {
        try {
            const account = await Account.findByIdAndDelete(req.params.id);
            if (!account) return res.status(404).json({ error: 'Account not found' });
            res.json({ message: 'Account deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

}