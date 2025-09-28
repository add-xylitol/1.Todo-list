const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');

router.post('/create', shareController.create);
router.post('/join', shareController.join);
router.get('/status/:code', shareController.status);
router.get('/history/:code', shareController.history);
router.post('/permissions', shareController.setPermissions);

module.exports = router;