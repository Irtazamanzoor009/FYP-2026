const nodemailer = require("nodemailer");
const { log } = require("./logger");
const renderTemplate = require("./htmlTemplateHandler");

const sendEmail = async (options) => {
  // 1. Create a transporter for Gmail
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // Use SSL. Set to false for port 587 (TLS).
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2. Render HTML if template is provided
  let html;
  if (options.template) {
    html = renderTemplate(options.template, options.variables || {});
  }

  // 3. Define email options
  const mailOptions = {
    from: "ProManage Bot <your.email@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    ...(html && { html }),
  };

  // 4. Send the email
  await transporter.sendMail(mailOptions);
  log(`Email sent to ${options.email}`);
};

module.exports = sendEmail;
