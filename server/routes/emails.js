const express = require('express')
const router = express.Router()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer");
const fs = require('fs');
const util = require('util');
// Convert fs.readFile into Promise version of same    
const readFile = util.promisify(fs.readFile);

const dotenv = require('dotenv')
dotenv.config()

const mongoConfig = require("../database/MongoConfig")
const { User } = mongoConfig
const jwt = require("jsonwebtoken")
const constants = require('../constants')
const { sendError, SECRET } = constants
const async = require("async")
const date = new Date()

// the email texts
// const confirmationEmail = await readFile('./written_emails/confirmation.txt')

// returns the hashed output given a password input with bcrypt
function hashPass(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
}

function sendResponse(res, success, message) {
  console.log("sending response...", success, message)
  return res.send({
    success,
    message,
  })
}

router.get("/confirmation", (req, res) => {
  var emailToken = req.query.token
  console.log(req.query)

  // MAKE NOTE TO MAYBE SCRAP ASYNC JS CODE LATER
  // LOOKS UGLY AF TO MAINTAIN
  // probably rewrite using Mongo transactions
  async.waterfall([
    // veryify the token
    function(callback) {
      jwt.verify(emailToken, SECRET, (err, decoded) => {
        if (err) {
          callback(err)
        } else {
          callback(null, decoded.username)
        }
      })
    },
    //check if user already registered
    function(decoded, callback) {
      console.log("username: ", decoded)
      User.findOne({username: decoded}, (err, results) => {
        if (results.registered) {
          callback(new Error("This user is already registered"))
        } else {
          callback(null, decoded)
        }
      })
    },
    // register user in database
    function(decoded, callback) {
      // gets the current time for the registration date
      var todayMil = date.getTime()
      var today = new Date(todayMil)
      // find user based on product code, which should be unique...
      User.findOneAndUpdate({username: decoded}, {registered: true, registerDate: today}, (err, results) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    }
  ], function(err, results) {
    if (err) {
      console.log("there was an error :(")
      console.error(err)
      sendResponse(res, false, "Something went wrong with the confirmation process."
                                        + " Contact us for support if needed: " + err.toString())
    } else {
      console.log("redirecting...")
      sendResponse(res, true, "Successfully signed up via email confirmation!")
    }
  })
});

router.post("/forgotPassword", (req, res) => {
  console.log("forgot password")
  // check if email is registered,
  // if it is, send a pw reset email
  var { email } = req.body
  console.log("email: ", email)
  email = email.toLowerCase();
  email = email.trim();
  async.waterfall([
    // check if email exists
    function(callback) {
      User.findOne({email: email}, (err, user) => {
        if (err) {
          callback(err)
        } else if (!user) {
          var userNotFoundError = new Error("This email has not been registered yet.")
          callback(userNotFoundError, user)
        } else if (user && !user.registered) {
          var userNotRegisteredError = new Error("This user has registered but has not confirmed. Please check the inbox for a confirmation email.")
          callback(userNotRegisteredError, user)
        } else {
          console.log("found the user: ", user)
          callback(null, user.firstName)
        }
      })
    },
    // sign an email token, which is verified on the pwResetPage
    function(firstName, callback) {
      console.log("signing email token...")
      jwt.sign({ email }, SECRET, { expiresIn: "12h" }, (err, token) => {
        console.log("done signing email token")
        if (err) {
          console.log(err)
          callback(err)
        } else {
          callback(null, token, firstName)
        }
      })
    },
    // send the email
    function(token, firstName, callback) {
      console.log("perparing to send email...")
      var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL,
          serviceClient: process.env.CLIENT_ID,
          privateKey: process.env.PRIVATE_KEY
        }
      })
      const confRedirect = `https://app.athloslive.com/pwResetPage?token=${token}`
      // const confRedirect = `http://localhost:3001/pwResetPage?token=${token}`
      var mailOptions = {
        from: "The Athlos Team",
        // to: `${email}`,
        // FOR TESTING PURPOSES
        to: 'davidshau22@berkeley.edu',
        subject: "Your Athlos Account Password Reset",
        text: 
          `Hey ${firstName}!\n`+
          'You are receiving this because you have requested the reset of the password for your account.\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n' +
          `${confRedirect}\n` +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n' +
          'Best,\n' +
          'The Athlos Team',
      }
      console.log("sending mail...")
      transporter.sendMail(mailOptions, function(err, data) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    },
  ], function(err, results) {
    if (err) {
      sendResponse(res, false, "something went wrong with the reset process: " + err.toString())
    } else {
      sendResponse(res, true, "password reset email was sent")
    }
  })
})

router.post("/confPasswordReset", async (req, res) => {
  var { newPassword, email } = req.body
  console.log("new pass is: ", newPassword)
  console.log('email is: ', email)
  var newHashedPass = hashPass(newPassword)
  // check if user exists
  try {
    const user = await User.findOne({email: email})
    console.log('user: ', user)
    if (!user) {
      throw new Error("This email is not registered")
    }
    user.password = newHashedPass
    await user.save();
    return sendResponse(res, true, "Successfully updated your password!")
  } catch(e) {
    console.log(e)
    return sendResponse(res, false, e.message)
  }
})

module.exports = router
