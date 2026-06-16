
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [1, 'Username must be at least 1 character'],
    maxlength: [150, 'Username cannot exceed 150 characters'],

    match: [/^[\w.@+-]+$/, 'Username may only contain letters, digits, and @/./+/-/_ characters'],
  },
}, {
  timestamps: true, 
});

userSchema.pre('save', async function (next) {

  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12); 
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.add({
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
