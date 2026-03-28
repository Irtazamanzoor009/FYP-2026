const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/predict', mlController.predict);
router.get('/health', mlController.health);

module.exports = router;