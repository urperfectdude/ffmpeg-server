const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// GET /health - Health check endpoint
router.get('/', healthController.checkHealth);

module.exports = router;
