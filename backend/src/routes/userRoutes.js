const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.patch('/update-profile', auth, userController.updateProfile);
router.post('/upload-avatar', auth, upload.single('avatar'), userController.uploadAvatar);
router.post('/change-password', auth, userController.changePassword);
router.post('/set-password', auth, userController.setPassword);

module.exports = router;