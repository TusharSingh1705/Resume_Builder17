
function escapeLatex(text) {
  if (!text) return '';

  // Must be in this exact order (backslash first to avoid double escaping)
  const specialChars = [
    ['\\', '\\textbackslash{}'],   // Must be first
    ['&', '\\&'],
    ['%', '\\%'],
    ['$', '\\$'],
    ['#', '\\#'],
    ['_', '\\_'],
    ['{', '\\{'],
    ['}', '\\}'],
    ['~', '\\textasciitilde{}'],
    ['^', '\\textasciicircum{}'],
  ];

  let result = text;
  for (const [char, escaped] of specialChars) {

    result = result.split(char).join(escaped);
  }

  return result;
}

module.exports = { escapeLatex };
