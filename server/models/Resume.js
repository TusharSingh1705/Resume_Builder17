
const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  year: { type: String, default: '' },
  degree: { type: String, default: '' },
  college: { type: String, default: '' },
  cgpa: { type: String, default: '' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  tech: { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  role: { type: String, default: '' },
  duration: { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

// ── Main Resume Schema ──
const resumeSchema = new mongoose.Schema({
  // user: ForeignKey → ObjectId reference (replaces Django's ForeignKey with CASCADE)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true,
  },

  name: {
    type: String,
    required: [true, 'Name is required'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    maxlength: [20, 'Phone cannot exceed 20 characters'],
    trim: true,
  },
  linkedin: {
    type: String,
    default: '',
    trim: true,
  },
  github: {
    type: String,
    default: '',
    trim: true,
  },
  summary: {
    type: String,
    default: '',
    trim: true,
  },

  // ── Dynamic Sections (stored as arrays — same as Django's JSONField) ──
  education: {
    type: [educationSchema],
    default: [],
  },
  experience: {
    type: [experienceSchema],
    default: [],
  },
  skills: {
    type: [String],
    default: [],
  },
  projects: {
    type: [projectSchema],
    default: [],
  },
  achievements: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true, 
});

resumeSchema.index({ user: 1, createdAt: -1 });

resumeSchema.virtual('displayName').get(function () {
  return `${this.name}`;
});

resumeSchema.set('toJSON', { virtuals: true });
resumeSchema.set('toObject', { virtuals: true });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
