const mongoConfig = require('../database/MongoConfig');
const { User } = mongoConfig
const express = require('express')
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const secret = 'secretkey'
const expiresIn = "12h"
const { ENDPOINTS } = require('../endpoints')
const confirmationPage = 'https://athloslive.com/confirmation'
const dotenv = require('dotenv')
dotenv.config()

const nodemailer = require("nodemailer");
const async = require("async")

// returns the hashed output given a password input with bcrypt
function hashPass(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
}

function sendErr(res, err) {
  return res.send({
    success: false,
    messages: [err.toString()]
  })
}

// FORMAT OF TOKEN
// Authorization: Bearer <access_token>
// called as middleware before jwt verifies the token
function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  // Check if bearer is undefined
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next()
  } else {
    // token is invalid or expired
    return res.send({
      success: false,
      messages: ['Error: Token is either expired or invalid. Please sign in again.']
    })
  }
}

router.post('/api/account/signup', function(req, res, next) {
  const { body } = req
  const { password, passwordConf } = body
  let { email, firstName, lastName, username } = body
  let failResBody = { success: false, messages: {} }
  // user entered a blank field
  if (!email || !password || !firstName || !lastName || !username) {
    return sendErr(res, new Error("Error: Please fill out all fields"))
  }
  if (password !== passwordConf) {
    return sendErr(res, new Error("Error: Passwords must match"))
  }
  // clean all inputs
  email = email.toLowerCase()
  email = email.trim()
  firstName = firstName.toLowerCase()
  firstName = firstName.trim()
  lastName = lastName.toLowerCase()
  lastName = lastName.trim()
  username = username.trim()

  // ADD FUNCTION FOR CHECKING INPUTS TO SEE IF THEY'RE VALID/WONT BREAK SYSTEM

  // Steps:
  // 1. Verify email and username don't exist
  // 2. Save
  // 3. Generate token for email
  // 4. Send confirmation email

  // initialize new user to add
  var newUser;

  // MAKE NOTE TO MAYBE SCRAP ASYNC JS CODE LATER
  // LOOKS UGLY AF TO MAINTAIN
  // CHANGE THIS INTO USING MONGO SESSIONS 

  var parallelCb = (err, results) => {
    console.log("parrallel finished")
    if (err) {
      return sendErr(res, err)
    }
    newUser = results[0]
    console.log("parallel finished running: ", newUser)

    async.waterfall([
      // 2.
      // first save the user in the database
      function(callback) {
        console.log("saving user")
        newUser.save(function(err, data) {
          console.log('saved user')
          if (err) {
            callback(err)
          } else {
            callback(null)
          }
        })
      },
      // 3. generate token for email
      // generate token for verification email
      function(callback) {
        console.log("signing token")
        // return a signed jwt token using the username
        jwt.sign({username}, secret, {expiresIn: expiresIn}, function(err, token) {
          if (err) {
            // DELETE USER FROM DATABASE
            callback(err)
          } else {
            callback(null, token)
          }
        })
      },
      // 4. send email
      // send the confirmation email
      function(emailToken, callback) {
        console.log(process.env.CLIENT_ID)
        console.log(process.env.PRIVATE_KEY)
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
        const confRedirect = `${confirmationPage}?token=${emailToken}`
        var mailOptions = {
          from: "The Athlos Team",
          to: `${email}`,
          subject: "Your Athlos Account",
          html: `Hello! \n Please click this link to finish your account registration:
          <a href=${confRedirect}>finish</a>`
        }
        //callback should contain err, result
        console.log("sending email...")
        transporter.sendMail(mailOptions, function(err, data) {
          console.log("sendmail finished running")
          if (err) {
            // DELETE USER FROM DATABASE
            callback(err)
          } else {
            callback(null, data)
          }
        })
      },
    ], waterfallCb)
  }

  var waterfallCb = async (err, results) => {
    if (err) {
      // any errors in the above functions will skip the next functions and go here
      console.log("ERROR: ", err)
      // DELETE USER FROM DATABASE IF THEY HAVE BEEN SAVED
      try {
        console.log("deleing user from database")
        let results = await User.findOneAndDelete({username: username})
      } catch(e) {
        console.err(e)
      } finally {
        return sendErr(res, err)
      }
    } else {
      console.log("no errors", results)
      return res.send({
        success: true,
        messages: [`Successfully signed up! Please check your inbox at ${email} for a confirmation email.`]
      })
    }
  }

  // 1. Verify email and username don't exist
  async.parallel([
    // check if email already exists
    function(callback) {
      console.log("checking if email exits...")
      User.findOne({email: email}, (err, user) => {
        console.log("finished find one for email")
        if (user) {
          var emailExistsError = new Error("email already exists")
          callback(emailExistsError)
        } else if (err) {
          callback(err)
        } else {
          // hash the user's password before putting it in database
          let hash = hashPass(password)

          // create a new document
          var userToSave = new User({
            email,
            password: hash,
            firstName,
            lastName,
            username,
          })
          callback(null, userToSave)
        }
      })
    },
    // check if username already exists
    function(callback) {
      console.log("checking if username exists...")
      User.findOne({username: username}, (err, user) => {
        console.log("finished find one for username")
        if (user) {
          var usernameExistsError = new Error("username already exists")
          callback(usernameExistsError)
        } else if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    },
    // // check if product already registered
    // function(callback) {
    //   console.log("third function")
    //   User.findOne({productCode: productCode}, (err, user) => {
    //     if (user) {
    //       var productCodeExistsError = new Error("This Amphibian has already been registered")
    //       callback(productCodeExistsError)
    //     } else if (err) {
    //       callback(err)
    //     } else {
    //       callback(null)
    //     }
    //   })
    // }
  ], parallelCb)
})

router.post('/api/account/signin', (req, res, next) => {
  const { body } = req;
  //get body content
  const { password } = body;
  let { email } = body;

  // make sure email, password aren't empty
  let failResBody = { success: false, messages: [] }
  // user entered a blank email
  if (!email) {
    failResBody.messages.push('Error: Email cannot be blank.')
  }
  if (!password) {
    failResBody.messages.push('Error: Password cannot be blank.')
  }
  if (!email || !password) {
    return res.send(failResBody)
  }

  email = email.toLowerCase();
  email = email.trim();
  // check that email exists
  User.findOne({email: email})
    .then(function(user) {
      if (user) {
        // first check if they're even registered
        if (!user.registered) {
          failResBody.messages.push("You haven't finished registering yet! Check your inbox or spam for a confirmation email from the Athlos team!");
          return res.send(failResBody);
        }
        // wrong password entered
        if (!user.validPassword(password)) {
          failResBody.messages.push('Error: Incorrect Password')
          return res.send(failResBody)
        }
        //get the _id from the queried user
        const _id = user._id

        // token expires in 60 days if we want this
        // var expiration = "60d"
        // return a signed jwt token using the _id unique to the user
        // jwt.sign({_id}, secret, {expiresIn: expiration}, (err, token) => {
        //   if (err) {
        //     return sendErr(res, err)
        //   }
        //   return res.send({
        //     success: true,
        //     token,
        //     messages: ['successfully verified token']
        //   })
        // })
        jwt.sign({_id}, secret, (err, token) => {
          if (err) {
            return sendErr(res, err)
          }
          return res.send({
            success: true,
            token,
            messages: ['successfully verified token']
          })
        })
      } else { // else for if (user)
        // couldn't find email in the database
        failResBody.messages.push("Error: This email has not been registered yet.")
        return res.send(failResBody)
      }
    })
    .catch(function(err) {
      if (err) throw err
    })
})

router.get('/api/account/verify', verifyToken, (req, res, next) => {
  console.log("verifying...")

  jwt.verify(req.token, secret, (err, authData) => {
    if (err) {
      // token probably isn't verified
      console.log(err)
      res.json({
        success: false,
        messages: [err.toString()],
      })
    } else {
      res.json({
        success: true,
        messages: ['token was successfully verified!'],
        token: authData,
      })
    }
  })
})

module.exports = router;
