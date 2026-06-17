
const fs = require('fs');
const path = require('path');

const Resume = require('../models/Resume');
const asyncHandler = require('../utils/asyncHandler');
const { escapeLatex } = require('../utils/latexEscape');
const { enhanceText: aiEnhanceText } = require('../services/aiService');

// Cloud LaTeX compilation API
const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';

const home = (req, res) => {
  res.render('index');
};

const generateResume = asyncHandler(async (req, res) => {

  const rawName = (req.body.name || '').trim();
  const rawSubtitle = (req.body.subtitle || '').trim();
  const rawPhone = (req.body.phone || '').trim();
  const rawEmail = (req.body.email || '').trim();
  const rawGithub = (req.body.github || '').trim();
  const rawLinkedin = (req.body.linkedin || '').trim();

  // ── Validate required fields ──
  // Mirrors views.py lines 104-111
  if (!rawName || !rawPhone || !rawEmail) {
    return res.status(400).send(
      '<h1>Missing Required Fields</h1>' +
      '<p>Name, phone, and email are required.</p>' +
      '<p><a href="/home">Go back</a></p>'
    );
  }

  // ── 2. PARSE DYNAMIC SECTIONS ──────────────────────────────
  // In Express with extended: true, array fields like name[] come as arrays

  // Education — mirrors views.py lines 116-129
  const eduYears = ensureArray(req.body['edu_year[]']);
  const eduDegrees = ensureArray(req.body['edu_degree[]']);
  const eduInstitutes = ensureArray(req.body['edu_institute[]']);
  const eduCgpas = ensureArray(req.body['edu_cgpa[]']);

  const educationList = [];
  const eduLen = Math.min(eduYears.length, eduDegrees.length, eduInstitutes.length, eduCgpas.length);
  for (let i = 0; i < eduLen; i++) {
    if (eduDegrees[i].trim()) {
      educationList.push({
        year: eduYears[i].trim(),
        degree: eduDegrees[i].trim(),
        college: eduInstitutes[i].trim(),
        cgpa: eduCgpas[i].trim(),
      });
    }
  }

  // Projects — mirrors views.py lines 132-143
  const projTitles = ensureArray(req.body['proj_title[]']);
  const projTechs = ensureArray(req.body['proj_tech[]']);
  const projDescs = ensureArray(req.body['proj_desc[]']);

  const projectsList = [];
  const projLen = Math.min(projTitles.length, projTechs.length, projDescs.length);
  for (let i = 0; i < projLen; i++) {
    if (projTitles[i].trim()) {
      projectsList.push({
        title: projTitles[i].trim(),
        tech: projTechs[i].trim(),
        description: projDescs[i].trim(),
      });
    }
  }

  // Positions of Responsibility / Experience — mirrors views.py lines 146-157
  const respTitles = ensureArray(req.body['resp_title[]']);
  const respDates = ensureArray(req.body['resp_date[]']);
  const respDescs = ensureArray(req.body['resp_desc[]']);

  const experienceList = [];
  const respLen = Math.min(respTitles.length, respDates.length, respDescs.length);
  for (let i = 0; i < respLen; i++) {
    if (respTitles[i].trim()) {
      experienceList.push({
        role: respTitles[i].trim(),
        duration: respDates[i].trim(),
        description: respDescs[i].trim(),
      });
    }
  }

  // Skills — mirrors views.py line 160
  const skillsList = ensureArray(req.body['skill[]'])
    .map(s => s.trim())
    .filter(s => s);

  // Achievements — mirrors views.py line 163
  const achievementsList = ensureArray(req.body['achievement[]'])
    .map(a => a.trim())
    .filter(a => a);

  // ── 3. SAVE TO DATABASE ────────────────────────────────────
  // Mirrors views.py lines 166-179
  const resumeObj = await Resume.create({
    user: req.session.userId,
    name: rawName,
    email: rawEmail,
    phone: rawPhone,
    github: rawGithub,
    linkedin: rawLinkedin,
    summary: rawSubtitle,
    education: educationList,
    projects: projectsList,
    experience: experienceList,
    skills: skillsList,
    achievements: achievementsList,
  });

  // ── 4. BUILD LATEX CONTENT ─────────────────────────────────
  // Exact port of views.py lines 183-260

  // -- Education section (uses \resumeSubheading) --
  // Mirrors views.py lines 184-194
  let educationLatex = '';
  if (educationList.length === 0) {
    educationLatex = '\\item[] \\vspace{-2em}\n';
  } else {
    for (let i = 0; i < educationList.length; i++) {
    const edu = educationList[i];
    educationLatex +=
      `\\resumeSubheading\n` +
      `  {${escapeLatex(edu.college)}}\n` +
      `  {CGPA: ${escapeLatex(edu.cgpa)}}\n` +
      `  {${escapeLatex(edu.degree)}}\n` +
      `  {${escapeLatex(edu.year)}}\n`;
    if (i < educationList.length - 1) {
      educationLatex += '\n\\vspace{-6pt}\n\n';
    }
  }
}

  let skillsLatex = '';
  if (skillsList.length === 0) {
    skillsLatex = '\\item[] \\vspace{-2em}\n';
  } else {
    for (const skill of skillsList) {
    if (skill.includes(':')) {
      const [cat, ...rest] = skill.split(':');
      const sk = rest.join(':'); 
      skillsLatex += `\\item \\textbf{${escapeLatex(cat.trim())}:} ${escapeLatex(sk.trim())}\n\n`;
    } else {
      skillsLatex += `\\item ${escapeLatex(skill)}\n\n`;
    }
  }
}

  let respLatex = '';
  if (experienceList.length === 0) {
    respLatex = '\\item[] \\vspace{-2em}\n';
  } else {
    for (const exp of experienceList) {
    respLatex += `\\resumePOR{${escapeLatex(exp.role)}}{}{${escapeLatex(exp.duration)}}\n`;
    if (exp.description) {
      respLatex += '\\resumeItemListStart\n';
      for (const bullet of exp.description.split('\n')) {
        if (bullet.trim()) {
          respLatex += `    \\item ${escapeLatex(bullet.trim())}\n`;
        }
      }
      respLatex += '\\resumeItemListEnd\n';
    }
    respLatex += '\n';
  }
}

  let projectsLatex = '';
  if (projectsList.length === 0) {
    projectsLatex = '\\item[] \\vspace{-2em}\n';
  } else {
    for (const proj of projectsList) {
    projectsLatex += `\\resumePOR{${escapeLatex(proj.title)}}{${escapeLatex(proj.tech)}}{}\n`;
    if (proj.description) {
      projectsLatex += '\\resumeItemListStart\n';
      for (const bullet of proj.description.split('\n')) {
        if (bullet.trim()) {
          projectsLatex += `    \\item ${escapeLatex(bullet.trim())}\n`;
        }
      }
      projectsLatex += '\\resumeItemListEnd\n';
    }
    projectsLatex += '\n\\vspace{-4pt}\n\n';
  }
}

  let achievementsLatex = '';
  if (achievementsList.length === 0) {
    achievementsLatex = '\\item[] \\vspace{-2em}\n';
  } else {
    for (const ach of achievementsList) {
    achievementsLatex += `\\vspace{-4pt}\n\n\\resumePOR{${escapeLatex(ach)}}{}{}\n\n`;
  }
}

  const templatePath = path.join(__dirname, '..', 'templates', 'resume_template.tex');
  let texContent = fs.readFileSync(templatePath, 'utf-8');

  const githubUrl = rawGithub.startsWith('http') ? rawGithub : `https://${rawGithub}`;
  const githubText = escapeLatex(rawGithub.replace('https://', '').replace('http://', ''));

  const linkedinUrl = rawLinkedin.startsWith('http') ? rawLinkedin : `https://${rawLinkedin}`;
  const linkedinText = escapeLatex(rawLinkedin.replace('https://', '').replace('http://', ''));

  const replacements = {
    '<<NAME>>': escapeLatex(rawName.toUpperCase()),
    '<<SUBTITLE>>': escapeLatex(rawSubtitle),
    '<<PHONE>>': escapeLatex(rawPhone),
    '<<EMAIL>>': escapeLatex(rawEmail),
    '<<GITHUB_URL>>': githubUrl,
    '<<GITHUB_TEXT>>': githubText,
    '<<LINKEDIN_URL>>': linkedinUrl,
    '<<LINKEDIN_TEXT>>': linkedinText,
    '<<EDUCATION_ITEMS>>': educationLatex,
    '<<SKILL_ITEMS>>': skillsLatex,
    '<<RESPONSIBILITY_ITEMS>>': respLatex,
    '<<PROJECT_ITEMS>>': projectsLatex,
    '<<ACHIEVEMENT_ITEMS>>': achievementsLatex,
  };

  for (const [key, value] of Object.entries(replacements)) {
    texContent = texContent.split(key).join(value);
  }

  // ── 5. COMPILE LATEX VIA CLOUD API ─────────────────────────
  try {
    const response = await fetch(LATEX_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [
          {
            main: true,
            content: texContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LaTeX API returned ${response.status}: ${errorText}`);
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    // Store PDF in MongoDB
    resumeObj.pdfData = pdfBuffer;
    await resumeObj.save();

    return res.redirect('/dashboard');

  } catch (compileError) {

    await Resume.findByIdAndDelete(resumeObj._id);

    return res.status(500).send(
      `<h1>LaTeX Compilation Failed</h1>` +
      `<p>There was an error generating your resume PDF. ` +
      `Please check your input for special characters.</p>` +
      `<pre style="max-height:400px;overflow:auto;background:#f5f5f5;` +
      `padding:16px;border-radius:8px;font-size:12px;">${escapeHtml(compileError.message)}</pre>` +
      `<br><a href="/home">← Go Back</a>`
    );
  }
});

const dashboard = asyncHandler(async (req, res) => {

  const resumes = await Resume.find({ user: req.session.userId })
    .sort({ createdAt: -1 })
    .lean();

  res.render('dashboard', { resumes });
});

const deleteResume = asyncHandler(async (req, res) => {
  const resumeId = req.params.id;

  try {
    await Resume.findOneAndDelete({
      _id: resumeId,
      user: req.session.userId,
    });
  } catch {
    // ignore
  }

  return res.redirect('/dashboard');
});

const downloadResume = asyncHandler(async (req, res) => {
  const resumeId = req.params.id;

  let resume;
  try {
    resume = await Resume.findOne({
      _id: resumeId,
      user: req.session.userId,
    });
  } catch {
    return res.status(404).send('Resume not found.');
  }

  if (!resume) {
    return res.status(404).send('Resume not found.');
  }

  if (!resume.pdfData) {
    return res.status(404).send('PDF not yet generated for this resume.');
  }

  const safeName = resume.name.replace(/ /g, '_').replace(/\//g, '-');
  const filename = `${safeName}_Resume.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(resume.pdfData);
});

const renameResume = asyncHandler(async (req, res) => {
  const resumeId = req.params.id;

  let newName = '';
  if (req.body && req.body.name) {
    newName = req.body.name.trim();
  }

  if (!newName) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, user: req.session.userId },
      { name: newName },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    return res.json({ success: true, name: resume.name });
  } catch {
    return res.status(404).json({ error: 'Resume not found.' });
  }
});

// ════════════════════════════════════════════════
//  API — AI Text Enhancement
//  Exact port of views.py enhance_text() lines 402-473
// ════════════════════════════════════════════════

/**
 * POST /enhance
 * API Endpoint to enhance resume bullet points using Gemini AI.
 */
const enhanceText = asyncHandler(async (req, res) => {
  const originalText = (req.body.text || '').trim();

  if (!originalText) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {

    const result = await aiEnhanceText(originalText);
    return res.json(result);
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  home,
  generateResume,
  dashboard,
  deleteResume,
  downloadResume,
  renameResume,
  enhanceText,
};
