
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

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
    seeCommunity,
    seeFitness,
    seeBasicInfo,
    unitSystem,
    seeBests,
    seeTotals,
    userToken
  } = req.body
  console.log('updating user settings...', req.body)

  // make sure all of them are present
  // if (!seeCommunity || !seeFitness || !seeBasicInfo || !unitSystem || !seeBests || !seeTotals) {
  //   return sendError(res, Error("Something went wrong with saving your settings. Please logout and try again."))
  // }
  
  var userID;
  try {
    userID = await jwt.verify(userToken, secret)
  } catch(e) {
    return sendError(res, e)
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOne({_id: userID._id}).session(session);
    user.settings = {
      seeCommunity: seeCommunity ? seeCommunity : user.settings.seeCommunity,
      seeFitness: seeFitness ? seeFitness : user.settings.seeFitness,
      seeBasicInfo: seeBasicInfo ? seeBasicInfo : user.settings.seeBasicInfo,
      unitSystem: unitSystem ? unitSystem : user.settings.unitSystem,
      seeBests: seeBests ? seeBests : user.settings.seeBests,
      seeTotals: seeTotals ? seeTotals : user.settings.seeTotals,
    }
    await user.save();
    await session.commitTransaction();
    return res.send({
      success: true,
      messages: {
        msg: "successfully updated your settings!"
      }
    })
  } catch(e) {
    await session.abortTransaction();
    return sendError(res, e)
  } finally {
    session.endSession();
  }
})

module.exports = router
