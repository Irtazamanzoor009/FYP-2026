const fs = require("fs");
const path = require("path");

function renderTemplate(templateName, variables = {}) {
  const templatePath = path.join(
    __dirname,
    "emailTemplates",
    `${templateName}.html`
  );
  let template = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, value);
  }
  return template;
}

module.exports = renderTemplate;
