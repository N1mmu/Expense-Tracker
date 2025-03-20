const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// Routes
router.get('/', inventoryController.inventory);

module.exports = router;