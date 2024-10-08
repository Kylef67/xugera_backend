const express = require('express');
const transaction = require('../controllers/transaction');
const router = express.Router();

router.post('/transaction' , transaction.post);
router.get('/transaction' , transaction.all);
router.get('/transaction/:id' , transaction.get);
router.put('/transaction/:id', transaction.update);
router.delete('/transaction/:id', transaction.delete);

module.exports = router