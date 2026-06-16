
const express = require('express');
const router = express.Router();

const {
  home,
  generateResume,
  dashboard,
  deleteResume,
  downloadResume,
  renameResume,
  enhanceText,
} = require('../controllers/resumeController');

const { isAuthenticated } = require('../middleware/auth');

router.get('/home', isAuthenticated, home);

router.post('/generate', isAuthenticated, generateResume);

router.get('/dashboard', isAuthenticated, dashboard);

router.post('/delete/:id', isAuthenticated, deleteResume);

router.get('/download/:id', isAuthenticated, downloadResume);

router.post('/rename/:id', isAuthenticated, renameResume);

router.post('/enhance', enhanceText);

module.exports = router;
