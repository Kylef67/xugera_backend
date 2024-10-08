const express = require('express');
const transaction = require('../controllers/transaction');
const router = express.Router();

router.post('/transaction' , transaction.post);
router.get('/transaction' , transaction.all)

module.exports = router