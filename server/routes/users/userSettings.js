const express = require('express')
const router = express.Router()

const jwt = require("jsonwebtoken")
const secret = 'secretkey'

// imports for mongo
const mongoConfig = require("../../database/MongoConfig")
const { User} = mongoConfig

function sendError(res, err) {
  return res.send({
    success: false,
    message: err.toString(),
  })
}

router.post("/updateSettings", async (req, res) => {
  var { 
    seeFriendsList,
    seeFitness,
    seeBasicInfo,
    unitSystem,
    swimLap,
    userToken
  } = req.body

  // make sure all of them are present
  if (!seeFriendsList || !seeFitness || !seeBasicInfo || !unitSystem || !swimLap) {
    return sendError(res, Error("Something went wrong with saving your settings. Please logout and try again."))
  }
  
  let settings = {
    seeFriendsList,
    seeFitness,
    seeBasicInfo,
    unitSystem,
    swimLap,
  }
  var userID;
  try {
    userID = await jwt.verify(userToken, secret)
  } catch(e) {
    return sendError(res, e)
  }

  try {
    var doc = await User.findOneAndUpdate(
      {_id: userID._id},
      {settings: settings},
    )
    return res.send({
      success: true,
      messages: {
        msg: "successfully updated your settings!"
      }
    })
  } catch(e) {
    return sendError(res, e)
  }
})

module.exports = router
