const express = require('express');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

// Route
router.get('/', expenseController.expense);
router.post('/add',expenseController.add);
router.get('/remove',expenseController.remove);

module.exports = router;