// express router imports
const extractToken = require("../extract.js")
const express = require('express')
const router = express.Router()

// imports for mongo
const mongoConfig = require("../../database/MongoConfig")
const { User } = mongoConfig
const { DateTime } = require('luxon');
// other modules and constants
const jwt = require("jsonwebtoken")
const mongoose = require('mongoose')
const { getNextSaturday, getLastSunday } = require("../../utils/dates.js")
const secret = 'secretkey'

function sendError(res, err) {
  return res.send({
    success: false,
    message: err.toString(),
  })
}

// gets all the user info that is stored in the document in mongo
router.get("/getUserInfo", extractToken, (req, res, next) => {
  const projection = { __v: 0, password: 0, productCode: 0, registered: 0, registerDate: 0 }
  //verify token
  var userID;
  jwt.verify(req.token, secret, (err, decoded) => {
    if (err) {
      sendError(res, err)
      throw err
    }
    userID = decoded
    User.findOne(
      {"_id": userID},
      projection,
    )
    .exec((err, results) => {
      if (err) {
        throw err
        sendError(res, err)
      }
      return res.send({
        success: true,
        message: "got request",
        ...results._doc
      })
    })
  })
})

/**
 * Find the user with the associated ID and get their bests object
 * for displaying a user's friends' bests
 */
router.post("/getBests", (req, res) => {
  const projection = { bests: 1 }
  var { id } = req.body
  User.findOne(
    {"_id": id},
    projection,
  )
  .exec((err, results) => {
    if (err) {
      throw err
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

router.post("/getUsername", (req, res) => {
  const projection = { username: 1 }
  var { id } = req.body
  User.findOne(
    {"_id": id},
    projection,
  )
  .exec((err, results) => {
    if (err) {
      throw err
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

router.post("/updateDeviceID", (req, res) => {
  const { userID, deviceID } = req.body;
  // update database with new profile changes
  User.findOneAndUpdate(
    {"_id": userID},
    { deviceID, }
  ).exec((err, results) => {
    if (err) {
      return sendError(res, err);
    } else {
      return res.send({ success: true });
    }
  });
});

router.post("/updateProfile", (req, res) => {
  var { userToken, firstName, lastName, bio, gender, height, weight, location, age } = req.body
  console.log(req.body);
  // remove any undefined fields
  // Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : {});

  // MAKE SURE REMOVING UNDEFINED AND NULL WORKS

  // decode user token
  var userID = null;
  jwt.verify(userToken, secret, (err, decoded) => {
    if (err) {
      console.log("error updating user profile: ", err);
      return sendError(res, err);
    }
    userID = decoded._id;
  });
  if (!userID) {
    return;
  }

  // update database with new profile changes
  User.findOneAndUpdate(
    {"_id": userID},
    {
      firstName,
      lastName,
      bio,
      gender,
      height,
      weight,
      location,
      age,
    }
  ).exec((err, results) => {
    if (err) {
      return sendError(res, err);
    } else {
      res.send({ success: true });
    }
  });
});

router.post("/updateWeeklyGoals", async (req, res) => {
  var {
    userID,
    goalSteps,
    goalLaps,
    goalVertical,
    goalCaloriesBurned,
    goalWorkoutTime,
    userToday
  } = req.body;
  const clientToday = DateTime.fromISO(userToday, {setZone: true});
  const today = DateTime.local({zone: clientToday.zone});
  console.log("updating weekly goals...");

  // start session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ _id: userID }).session(session);
    user.goals = {
      goalSteps: goalSteps || goalSteps === 0 ? goalSteps : user.goals.goalSteps,
      goalLaps: goalLaps || goalLaps === 0 ? goalLaps : user.goals.goalLaps,
      goalVertical: goalVertical || goalVertical === 0 ? goalVertical : user.goals.goalVertical,
      goalCaloriesBurned: goalCaloriesBurned || goalCaloriesBurned === 0 ? goalCaloriesBurned : user.goals.goalCaloriesBurned,
      goalWorkoutTime: goalWorkoutTime || goalWorkoutTime === 0 ? goalWorkoutTime : user.goals.goalWorkoutTime,
    }
    await user.save();
    const lastSunday = getLastSunday(today);
    const nextSaturday = getNextSaturday(today);
    const RunActivityData  = mongoConfig.Run;
    const SwimActivityData = mongoConfig.Swim;
    const JumpActivityData = mongoConfig.Jump;

    const runSessions = await RunActivityData.find({
      userID,
      uploadDate: {
        $gte: lastSunday,
        $lte: nextSaturday,
      }
    }).session(session);
    for (let i = 0; i < runSessions.length; i++) {
      runSessions[i].goalSteps = goalSteps;
      await runSessions[i].save();
    }

    const swimSessions = await SwimActivityData.find({
      userID,
      uploadDate: {
        $gte: lastSunday,
        $lte: nextSaturday,
      }
    }).session(session);
    for (let i = 0; i < swimSessions.length; i++) {
      swimSessions[i].goalLaps = goalLaps;
      await swimSessions[i].save();
    }

    const jumpSessions = await JumpActivityData.find({
      userID,
      uploadDate: {
        $gte: lastSunday,
        $lte: nextSaturday,
      }
    }).session(session);
    for (let i = 0; i < jumpSessions.length; i++) {
      jumpSessions[i].goalVertical = goalVertical;
      await jumpSessions[i].save();
    }

    // commit the changes if everything was successful
    await session.commitTransaction();
    // send success response back to client
    return res.send({
      success: true,
      message: `Successfully updated your goals!`
    });
  } catch(e) {
    console.log('Error in updating weekly goals: ', e.toString());
    // this will rollback any changes made in the database
    await session.abortTransaction();
    return sendError(res, e.toString());
  } finally {
    session.endSession();
  }
});

router.post("/updateUserBests", async (req, res) => {
  const { token, bests } = req.body;
  var userID;
  try {
    userID = (await jwt.verify(token, secret))._id;
  } catch(e) {
    return sendError(response, e);
  }
  mongoose.connection.transaction(async function executor() {
    const user = await User.findOne({ _id: userID });
    console.log("run efforts: ", user);
    if (!user) {
      return sendError(res, new Error("User does not exist :/"));
    }
    user.bests = bests;
    await user.save();
    res.send({success: true});
  }).catch(e => {
    sendError(res, e);
  });
});

router.post("/updateUserRunEfforts", async (req, res) => {
  const { token, runEfforts } = req.body;
  var userID;
  try {
    userID = (await jwt.verify(token, secret))._id;
  } catch(e) {
    return sendError(response, e);
  }
  mongoose.connection.transaction(async function executor() {
    const user = await User.findOne({ _id: userID });
    console.log("run efforts: ", user);
    if (!user) {
      return sendError(res, new Error("User does not exist :/"));
    }
    user.runEfforts = runEfforts;
    await user.save();
    res.send({success: true});
  }).catch(e => {
    sendError(res, e);
  });
});

router.post("/updateUserSwimEfforts", async (req, res) => {
  const { token, swimEfforts } = req.body;
  var userID;
  try {
    userID = (await jwt.verify(token, secret))._id;
  } catch(e) {
    return sendError(response, e);
  }
  mongoose.connection.transaction(async function executor() {
    const user = await User.findOne({ _id: userID });
    console.log("swimEfforts: ", user);
    if (!user) {
      return sendError(res, new Error("User does not exist :/"));
    }
    user.swimEfforts = swimEfforts;
    await user.save();
    res.send({success: true});
  }).catch(e => {
    sendError(res, e);
  });
});

router.post("/updateUserWalkEfforts", async (req, res) => {
  const { token, walkEfforts } = req.body;
  var userID;
  try {
    userID = (await jwt.verify(token, secret))._id;
  } catch(e) {
    return sendError(response, e);
  }
  mongoose.connection.transaction(async function executor() {
    const user = await User.findOne({ _id: userID });
    console.log("walkEfforts: ", user);
    if (!user) {
      return sendError(res, new Error("User does not exist :/"));
    }
    user.walkEfforts = walkEfforts;
    await user.save();
    res.send({success: true});
  }).catch(e => {
    sendError(res, e);
  });
});

router.get("/tokenToID", extractToken, (req, res, next) => {
  jwt.verify(req.token, secret, (err, decoded) => {
    if (err) {
      throw err
      sendError(res, err)
    } else {
      return res.send({
        success: true,
        userID: decoded._id
      })
    }
  })
})

module.exports = router
