
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const getRegister = (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', {
    errors: req.flash('errors') || [],
    formData: (() => {
      try { return JSON.parse(req.flash('formData')[0] || '{}'); }
      catch { return {}; }
    })(),
  });
};

const postRegister = asyncHandler(async (req, res) => {
  const { username, password1 } = req.body;

  const existingUser = await User.findOne({ username: username.trim() });
  if (existingUser) {
    req.flash('errors', ['A user with that username already exists.']);
    req.flash('formData', JSON.stringify({ username }));
    return res.redirect('/');
  }

  const user = await User.create({
    username: username.trim(),
    password: password1,
  });

  req.flash('success', ['Account created successfully! Please log in.']);
  return res.redirect('/login');
});

const getLogin = (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    errors: req.flash('errors') || [],
    success: req.flash('success') || [],
    formData: (() => {
      try { return JSON.parse(req.flash('formData')[0] || '{}'); }
      catch { return {}; }
    })(),
  });
};

const postLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username: username.trim() });
  if (!user) {
    req.flash('errors', ['Please enter a correct username and password. Note that both fields may be case-sensitive.']);
    req.flash('formData', JSON.stringify({ username }));
    return res.redirect('/login');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    req.flash('errors', ['Please enter a correct username and password. Note that both fields may be case-sensitive.']);
    req.flash('formData', JSON.stringify({ username }));
    return res.redirect('/login');
  }

  req.session.userId = user._id;
  req.session.username = user.username;

  return res.redirect('/dashboard');
});

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }

    res.clearCookie('connect.sid');

    return res.redirect('/login');
  });
};

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  logout,
};
