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

router.post('/getSearchUser', async (req, res) => {
  var { _id, userToken } = req.body
  try {
    // user ID of the user who is viewing the profile
    var payload = await jwt.verify(userToken, secret)
  } catch(e) {
    return sendError(res, new Error("Your session has expired. Please refresh and login again."))
  }

  try {
    var {
      settings,
      firstName,
      lastName,
      friends,
      profilePicture,
    } = await User.findOne({_id: _id}, 'settings firstName lastName friends profilePicture')
    var isFriend = false
    console.log(payload)
    for (let i = 0; i < friends.length; i++) {
      console.log('friend: ', friends[i])
      if (friends[i]._id === payload._id) {
        isFriend = true
        break
      }
    }
  } catch(e) {
    console.error(e)
    return sendError(res, e)
  }
  return res.send({
    success: true,
    settings,
    firstName,
    lastName,
    isFriend,
    profilePicture
  })
})

router.post('/getSearchUserBasicInfo', async (req, res) => {
  var { _id } = req.body
  try {
    var { bio, weight, height, age, gender } = await User.findOne({_id: _id}, 'bio weight height age gender')
    return res.send({
      success: true,
      bio, weight, height, age, gender
    })
  } catch(e) {
    console.error(e)
    return sendError(res, e)
  }
})

router.post('/getSearchUserFitness', async (req, res) => {
  var { _id } = req.body
  try {
    var { bests, totals} = await User.findOne({_id: _id}, 'bests totals')
    return res.send({
      success: true,
      bests, totals
    })
  } catch(e) {
    console.error(e)
    return sendError(res, e)
  }
})

router.post('/getSearchUserFriends', async (req, res) => {
  var { _id } = req.body
  try {
    var { friends } = await User.findOne({_id: _id}, 'friends')
    return res.send({
      success: true,
      friends
    })
  } catch(e) {
    console.error(e)
    return sendError(res, e)
  }
})

module.exports = router