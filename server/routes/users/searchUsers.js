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

router.post('/getSearchUserPeople', async (req, res) => {
  console.log('getSearchUserPeople')
  const { _id } = req.body
  try {
    const { _doc } = await User.findOne({_id: _id}, 'followers following rivals')
    const { followers, following, rivals } = _doc
    return res.send({
      success: true,
      followers,
      following,
      rivals
    })
  } catch(e) {
    console.log(e)
    return sendError(res, e)
  }
})

router.post('/getSearchUser', async (req, res) => {
  var { _id, userToken } = req.body
  try {
    // user ID of the user who is viewing the profile
    var payload = await jwt.verify(userToken, secret)
  } catch(e) {
    return sendError(res, new Error("Your session has expired. Please refresh and login again."))
  }

  try {
    const { _doc } = await User.findOne({_id: _id}, 'settings firstName lastName followers profilePicture')
    // this are all the info about the person who's being searched
    var {
      settings,
      firstName,
      lastName,
      followers,
      profilePicture,
    } = _doc
    var follows = false
    console.log(_doc)
    for (let i = 0; i < followers.length; i++) {
      console.log('user: ', followers[i])
      if (followers[i]._id === payload._id) {
        follows = true
        break
      }
    }
  } catch(e) {
    console.log(e)
    return sendError(res, e)
  }
  return res.send({
    success: true,
    settings,
    firstName,
    lastName,
    follows,
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
    console.log(e)
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
    console.log(e)
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
    console.log(e)
    return sendError(res, e)
  }
})

module.exports = router