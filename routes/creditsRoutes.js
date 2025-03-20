const express = require('express');
const creditsController = require('../controllers/creditsController');

const router = express.Router();

// Route
router.get('/', creditsController.credits);
router.post('/add',creditsController.add);
router.get('/remove',creditsController.remove);

module.exports = router;