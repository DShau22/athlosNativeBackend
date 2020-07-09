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
    const { _doc } = await User.findOne({_id: _id}, 'settings firstName lastName friends profilePicture')
    var {
      settings,
      firstName,
      lastName,
      friends,
      profilePicture,
    } = _doc
    var isFriend = false
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
  const { _id } = req.body
  try {
    const { _doc } = await User.findOne({_id: _id}, 'bio weight height age gender')
    const { bio, weight, height, age, gender } = _doc
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
    var { _doc } = await User.findOne({_id: _id}, 'bests totals')
    var { bests, totals } = _doc
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
  const { _id } = req.body
  try {
    const { _doc } = await User.findOne({_id: _id}, 'friends')
    const { friends } = _doc
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