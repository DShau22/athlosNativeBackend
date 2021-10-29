// express router imports
const extractToken = require("../extract.js")
const express = require('express')
const router = express.Router()

// for profile picture uploads. Cloudinary stuff with multer for body parsing
const dotenv = require('dotenv')
const multer = require("multer")
const cloudinary = require("cloudinary")
// const cloudinaryStorage = require("multer-storage-cloudinary")
var formidable = require('formidable')

// imports for mongo
const mongoConfig = require("../../database/MongoConfig")
const { User } = mongoConfig

// other modules and constants
const jwt = require("jsonwebtoken")
const secret = 'secretkey'

function sendError(res, err) {
  return res.send({
    success: false,
    message: err,
  })
}

// configurations for cloudinary
dotenv.config()
cloudinary.config(
  {
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  }
)

// const storage = cloudinaryStorage(
//   {
//     cloudinary: cloudinary,
//     folder: "demo",
//     allowedFormats: ["jpg", "jpeg", "png"],
//     // transformation: [{ width: 500, height: 500, crop: "limit" }]
//   }
// )

// const multerParser = multer({ storage: storage }).single("profilePic");

// router.post("/checkDuplicatePic", (req, res) => {
//   var form = new formidable()
//   form.hash = "md5"
//   // fields will contain the picFile, and the current pic hash
//   form.parse(req, function(err, fields, files) {
//     // get user profile pic info from database
//     var { profilePic } = files
//     var { currImgHash } = fields
//     console.log(profilePic.hash, currImgHash)
//     if (profilePic.hash === currImgHash) {
//       return sendError(res, new Error("please upload a profile picture that is different from your current photo"))
//     } else {
//       return res.send({
//         success: true,
//       })
//     }
//   })
// })

/**
 * return profile pic url given a user ID
 * for display a user's friends' profiles
 */
router.post("/getProfilePic", (req, res) => {
  const projection = { profilePicture: 1 }
  var { id } = req.body
  User.findOne(
    {"_id": id},
    projection,
  )
  .exec((err, results) => {
    if (err) {
      sendError(res, err)
    } else if (!results) {
      var userNotFoundError = new Error("couldn't find the user with this id")
      sendError(res, userNotFoundError)
    }
    return res.send({
      success: true,
      ...results._doc
    })
  })
})

router.post("/uploadProfilePic", extractToken, async (req, res) => {
  // decode user token
  console.log("updating profile picture")
  var userID;
  jwt.verify(req.token, secret, (err, decoded) => {
    if (err) { return sendError(res, err) }
    userID = decoded._id
  });

  // make a cloudinary request
  const { email, base64 } = req.body.data._parts[0][1];
  const uploadStr = `data:image/jpeg;base64,${base64}`;
  cloudinary.v2.uploader.upload(uploadStr, {
    public_id: `profilePics/${email}`,
    folder: 'profilePics',
    overwrite: true,
    invalidate: true,
    phash: true,
    width: 500,
    height: 500,
    crop: "limit",
  }, (error, result) => {
    if (error) {
      return sendError(res, error.message);
    }
    const { secure_url, etag } = result;
    // update the database with new url and etag
    User.findOneAndUpdate(
      {"_id": userID},
      {profilePicture: { "profileURL": secure_url, 'etag': etag, }},
    ).exec((err, results) => {
      if (err) {
        return sendError(res, err.toString())
      } else {
        return res.send({
          success: true
        })
      }
    });
  });
})

module.exports = router
