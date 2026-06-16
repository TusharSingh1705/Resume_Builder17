
const { body, validationResult } = require('express-validator');

const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 1, max: 150 }).withMessage('Username must be between 1 and 150 characters.')
    .matches(/^[\w.@+-]+$/).withMessage('Username may only contain letters, digits, and @/./+/-/_ characters.'),

  body('password1')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('This password is too short. It must contain at least 8 characters.')
    .not().isNumeric().withMessage('This password is entirely numeric.'),

  body('password2')
    .notEmpty().withMessage('Password confirmation is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password1) {
        throw new Error("The two password fields didn't match.");
      }
      return true;
    }),
];

const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const handleValidationErrors = (redirectPath) => (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    const errorMessages = errors.array().map(err => err.msg);
    req.flash('errors', errorMessages);

    req.flash('formData', JSON.stringify({
      username: req.body.username || '',
    }));

    return res.redirect(redirectPath);
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors,
};
