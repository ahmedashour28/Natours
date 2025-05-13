const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = 'Ahmed Ashour <ahmedashour744@gmail.com>';
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // send
      return 1;
    }
    return nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 587,

      auth: {
        user: 'e0cd8bd9c9e660',
        pass: '4e4c51c812ba51',
      },
      tls: { rejectUnauthorized: false },
    });
  }

  // send the mail
  async send(template, subject) {
    // 1- render html based on the pug template that sent as a parameter
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );

    // email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    //create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to our family');
  }

  async sendResetPassword() {
    await this.send(
      'resetPassword',
      'your password reset token only valid for 10 min',
    );
  }
};
