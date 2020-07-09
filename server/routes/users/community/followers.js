const constants = require('../../../constants')
const { sendError, SECRET } = constants
const mongoConfig = require("../../../database/MongoConfig")
const { User } = mongoConfig
const async = require("async")
const mongoose = require('mongoose')
const jwt = require("jsonwebtoken")

// accept follow request
const acceptFollowerRequest = async (req, res) => {
  // 1. verify user token
  // 2. add to receiver's followers, remove from receiver's follwerRequests
  // 3. add to requester's following, remove from requester's followingPending
  // 4. send success response
  var {
    userToken,
    receiverFirstName,
    receiverLastName,
    receiverProfilePicUrl,

    requesterID,
    requesterFirstName,
    requesterLastName,
    requesterProfilePicUrl,
  } = req.body

  // 1.
  console.log(userToken, SECRET)
  try {
    var receiverID = await jwt.verify(userToken, SECRET)
  } catch(e) {
    return sendError(res, e)
  }

  // start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  // define friend objects
  const requesterObj = {
    _id: requesterID,
    firstName: requesterFirstName,
    lastName: requesterLastName,
    profilePicUrl: requesterProfilePicUrl
  }
  const receiverObj = {
    _id: receiverID,
    firstName: receiverFirstName,
    lastName: receiverLastName,
    profilePicUrl: receiverProfilePicUrl
  }
  try {
    
    const requester = await User.findOne({ _id: requesterID }).session(session);
    // add to the requester's followING list
    requester.following.push(receiverObj);
    // remove from requester's followingPending list
    requester.followingPending = requester.followingPending.filter(user => {
      return user._id !== receiverID
    });
    await requester.save();

    const receiver = await User.findOne({ _id: receiverID }).session(session);
    // add to the receiver's followERS list
    receiver.followers.push(requesterObj);
    // remove from receiver's followerRequests list
    receiver.followerRequests = receiver.followerRequests.filter(user => {
      return user._id !== requesterID
    })
    await receiver.save();

    // commit the changes if everything was successful
    await session.commitTransaction();
    // send success response back to client
    res.send({
      success: true,
      message: `${requesterFirstName} ${requesterLastName} now follows you!`
    })
  } catch(e) {
    console.error(e);
    // this will rollback any changes made in the database
    await session.abortTransaction();
    return sendError(res, e)
  } finally {
    session.endSession();
  }
}

// accept follow request
const rejectFollowerRequest = (req, res) => {
  res.send({
    success: true
  })
}

// removes a follower from followers list
const removeFollower = (req, res) => {
  res.send({
    success: true
  })
}

const followers = {
  acceptFollowerRequest,
  rejectFollowerRequest,
  removeFollower
}
module.exports = followers