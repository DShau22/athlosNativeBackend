// express router imports
const express = require('express')
const router = express.Router()

// imports for mongo
const mongoConfig = require("../../database/MongoConfig")
const { User } = mongoConfig

// other modules and constants
const async = require("async")
const jwt = require("jsonwebtoken")
const secret = 'secretkey'

router.post("/acceptRequest", (req, res) => {
  // 1. verify user token
  // 2. update user's friends (add sender), friendRequest fields (remove sender)
  // 3. update sender's friends (add user), friendsPending field (remove user)
  // 4. send success response
  // steps 2 and 3 should be done in parallel
  var {
    userToken,
    receiverFirstName,
    receiverLastName,
    senderID,
    senderFirstName,
    senderLastName,
  } = req.body

  // 1.
  var userID;
  jwt.verify(userToken, secret, (err, decoded) => {
    if (err) {
      throw err
      sendError(res, err)
    }
    userID = decoded._id
  })

  // callback for async parallel
  var cb = (err, results) => {
    if (err) {
      sendError(res, err)
    } else {
      res.send({
        success: true,
        message: `successfully added ${senderFirstName + " " + senderLastName} as a friend!`
      })
    }

  }

  // define friend objects
  var senderFriend = {
    _id: senderID,
    firstName: senderFirstName,
    lastName: senderLastName,
  }
  var userFriend = {
    _id: userID,
    firstName: receiverFirstName,
    lastName: receiverLastName,
  }

  // 2. and 3.
  async.parallel([
    // 2. add sender to user's friends list, remove sender from friend requests
    function(callback) {
      User.findOneAndUpdate(
        { '_id': userID},
        {
          "$pull": { "friendRequests": { "id": senderID } },
          "$push": { "friends": senderFriend }
        }
      )
      .exec((err, results) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    },
    //3. add user to sender's friends array, remove user from sender's pending array
    function(callback) {
      console.log("userID is: ", userID)
      User.findOneAndUpdate(
        { '_id': senderID},
        {
          "$pull": { "friendsPending": { "id": userID } },
          "$push": { "friends": userFriend }
        }
      )
      .exec((err, results) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    }
  ], cb)
})

router.post("/sendFriendReq", (req, res) => {
  // extract the friend's id that the user is sending a request to
  // also extract the token that is saved in local storage
  var { 
    receiverID, 
    token, 
    senderFirstName, 
    senderLastName, 
    senderUsername,
    receiverFirstName, 
    receiverLastName, 
    receiverUsername,
  } = req.body
  // define a callback for async parallel
  var cb = (err, results) => {
    if (err) {
      sendError(res, err)
    } else {
      res.send({
        success: true
      })
    }
  }

  // verify user token and save the decoded _id
  var user_id;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      sendError(res, err)
    } else {
      user_id = decoded._id
    }
  })

  // update user's friends pending array, and the receiver's
  // friend requests array
  async.parallel([
    // update receiver's requests array
    function(callback) {
      var friendRequest = {
        _id: user_id,
        firstName: senderFirstName,
        lastName: senderLastName,
        username: senderUsername,
      }
      User.findOneAndUpdate(
        { '_id': receiverID},
        { "$push": { "friendRequests": friendRequest } }
      )
      .exec((err, results) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    },
    // update sender's pending array
    function(callback) {
      var pendingJson = {
        _id: receiverID,
        firstName: receiverFirstName,
        lastName: receiverLastName,
        username: receiverUsername,
      }
      User.findOneAndUpdate(
        { '_id': user_id },
        { "$push": { "friendsPending": pendingJson } }
      )
      .exec((err, results) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    }
  ], cb)
})

module.exports = router
