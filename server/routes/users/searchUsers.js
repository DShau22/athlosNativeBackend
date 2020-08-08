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
    const { _doc } = await User.findOne(
      {_id: _id}, 
      'settings firstName lastName followers following followerRequests followingPending rivals profilePicture'
    )
    // this are all the info about the person who's being searched
    var {
      settings,
      firstName,
      lastName,
      followers,
      followerRequests,
      following,
      followingPending,
      rivals,
      profilePicture,
    } = _doc
    // CHECK THE PROFILE CONSTANTS TO MAKE SURE THESE ENUMS MATCH
    var relationshipStatus = 'unrelated'
    console.log(_doc)
    // can't use for each loop cuz can't break
    for (i = 0; i < followers.length; i++) {
      if (followers[i]._id === payload._id) {
        relationshipStatus = 'following';
        break;
      }
    }
    if (relationshipStatus === 'unrelated') for (i = 0; i < following.length; i++) {
      if (following[i]._id === payload._id) {
        relationshipStatus = 'follower';
        break;
      }
    }
    if (relationshipStatus === 'unrelated') for (i = 0; i < rivals.length; i++) {
      if (followerRequests[i]._id === payload._id) {
        relationshipStatus = 'is follower pending';
        break;
      }
    }
    if (relationshipStatus === 'unrelated') for (i = 0; i < rivals.length; i++) {
      if (followingPending[i]._id === payload._id) {
        relationshipStatus = 'is following pending';
        break;
      }
    }
  } catch(e) {
    console.log(e)
    return sendError(res, e)
  }
  return res.send({
    success: true,
    relationshipStatus,
    settings,
    firstName,
    lastName,
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

router.post('/getSearchUserFitnessBests', async (req, res) => {
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