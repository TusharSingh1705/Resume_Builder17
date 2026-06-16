
const express = require('express');
const router = express.Router();

const {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  logout,
} = require('../controllers/authController');

const {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} = require('../validators/resumeValidator');

const { isAuthenticated } = require('../middleware/auth');

router.get('/', getRegister);
router.post('/', registerValidation, handleValidationErrors('/'), postRegister);

router.get('/login', getLogin);
router.post('/login', loginValidation, handleValidationErrors('/login'), postLogin);

router.get('/logout', isAuthenticated, logout);

module.exports = router;