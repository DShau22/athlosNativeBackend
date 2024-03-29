const constants = require('../../../constants')
const { sendError, SECRET } = constants
const mongoConfig = require("../../../database/MongoConfig")
const { User } = mongoConfig
const mongoose = require('mongoose')
const jwt = require("jsonwebtoken")

// send follow request
const follow = async (req, res) => {
  console.log('following')
  console.log(req.body)
  // 1. verify user token
  // 2. Add to the requester's followingPending list
  // 3. Add to the receiver's followerRequests list
  // 4. send success response
  var {
    userToken,
    receiverId,
  } = req.body
  // 1.
  try {
    const requesterDoc = await jwt.verify(userToken, SECRET)
    var requesterId = requesterDoc._id
  } catch(e) {
    return sendError(res, e)
  }

  // start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requester = await User.findOne({ _id: requesterId }).session(session);
    const receiver = await User.findOne({ _id: receiverId }).session(session);
    // 2.
    newFollowingPendingUser = {
      _id: receiver._id.toString(),
      firstName: receiver.firstName,
      lastName: receiver.lastName,
      profilePicUrl: receiver.profilePicture.profileURL
    }
    requester.followingPending = [...requester.followingPending, newFollowingPendingUser]
    await requester.save();

    // 3.
    newFollowerRequest = {
      _id: requester._id.toString(),
      firstName: requester.firstName,
      lastName: requester.lastName,
      profilePicUrl: requester.profilePicture.profileURL
    }
    receiver.followerRequests = [...receiver.followerRequests, newFollowerRequest]
    await receiver.save();

    // commit the changes if everything was successful
    await session.commitTransaction();
    // 4.
    res.send({
      success: true,
      message: `successfully follower ${receiverId}`
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

// remove this person from user's following list
const unfollow = async (req, res) => {
  console.log('unfollowing')
  console.log(req.body)
  // 1. verify user token
  // 2. remove from the person who's being unfollowed's followers list
  // 3. remove from person who's doing the unfollowing's following list
  // 4. send success response
  var {
    userToken,
    userToUnfollowId,
  } = req.body

  // 1.
  try {
    const remover = await jwt.verify(userToken, SECRET)
    var unfollowerId = remover._id
  } catch(e) {
    return sendError(res, e)
  }

  // start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userBeingUnfollowed = await User.findOne({ _id: userToUnfollowId }).session(session);
    // 2.
    userBeingUnfollowed.followers = userBeingUnfollowed.followers.filter(person => {
      return person._id !== unfollowerId
    })
    await userBeingUnfollowed.save();

    const userWhosUnfollowing = await User.findOne({ _id: unfollowerId }).session(session);
    // 3.
    userWhosUnfollowing.following = userWhosUnfollowing.following.filter(person => {
      return person._id !== userToUnfollowId
    })
    await userWhosUnfollowing.save();

    // commit the changes if everything was successful
    await session.commitTransaction();
    // 4.
    res.send({
      success: true,
      message: `successfully unfollowed ${userToUnfollowId}`
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

// cancels the follow request that the user sent
const cancelFollowRequest = async (req, res) => {
  console.log('cancelling')
  console.log(req.body)
  // 1. verify user token
  // 2. remove from canceller's followingPending list
  // 3. remove from the request receiver's follower requests list
  // 4. send success response
  var {
    userToken,
    requestReceiverId,
  } = req.body

  // 1.
  try {
    const canceller = await jwt.verify(userToken, SECRET)
    var cancellerId = canceller._id
  } catch(e) {
    return sendError(res, e)
  }

  // start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userWhosCancelling = await User.findOne({ _id: cancellerId }).session(session);
    // 2.
    userWhosCancelling.followingPending = userWhosCancelling.followingPending.filter(person => {
      console.log(person._id !== requestReceiverId)
      console.log(person._id, requestReceiverId)
      return person._id !== requestReceiverId
    })
    console.log(userWhosCancelling.followingPending)
    await userWhosCancelling.save();

    const requestReceiver = await User.findOne({ _id: requestReceiverId }).session(session);
    // 3.
    requestReceiver.followerRequests = requestReceiver.followerRequests.filter(person => {
      return person._id !== cancellerId
    })
    await requestReceiver.save();

    // commit the changes if everything was successful
    await session.commitTransaction();
    // 4.
    res.send({
      success: true,
      message: `successfully canceled follow request`
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

const following = {
  follow,
  unfollow,
  cancelFollowRequest,
}
module.exports = following