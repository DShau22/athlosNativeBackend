const {
  getLastMonday,
  getNextSunday,
  sameDate,
} = require('../utils/dates');
const express = require('express');
const extractToken = require("./extract");
const router = express.Router();
const fs = require('fs');

const {
  unscrambleSessionBytes,
  createSessionJsons,
  calcReferenceTimes,
} = require('../utils/fitness');
const {User, Swim, Run, Jump} = require("../database/MongoConfig");
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const jwt = require("jsonwebtoken")
const secret = 'secretkey';

// maximum number of activity documents to query for a given activity
// max possible days you can go back according to frontend is 27 mondays ago
// 27 not 26 cuz if the current day is not a monday then you'll go back 27 else 26.
const MAX_DOCUMENTS = 27 * 7;

function sendError(res, err) {
  return res.send({
    success: false,
    message: err.toString(),
  })
}

function getModel(activity) {
  switch(activity) {
    case "jump":
      return Jump
    case "run":
      return Run
    case "swim":
      return Swim
  }
}

function reverse(array) {
  var i = 0,
      n = array.length,
      middle = Math.floor(n / 2),
      temp = null;

  for (; i < middle; i += 1) {
     temp = array[i];
     array[i] = array[n - 1 - i];
     array[n - 1 - i] = temp;
  }
}

// returns the default empty session object given the user's id and an uploadDate
const activityToSession = (activity, uploadDate, userID) => {
  switch(activity) {
    case "run":
      return {
        _id: '',
        userID,
        uploadDate: uploadDate.toISO(),
        num: 0,
        cadences: [],
        calories: 0,
        time: 0
      }
    case "swim":
      return {
        _id: '',
        userID,
        uploadDate: uploadDate.toISO(),
        num: 0,
        lapTimes: [],
        strokes: [],
        calories: 0,
        time: 0
      }
    case "jump":
      return {
        _id: '',
        userID,
        uploadDate: uploadDate.toISO(),
        num: 0,
        heights: [],
        shotsMade: 0,
        time: 0
      }
  }
};

router.post("/getUserFitness", async (request, response) => {
  const {
    userToken,
    activity,
    lastUpdated,
    userToday, // DateTime.local().toISO() from the user
  } = request.body;
  console.log("getting user fitness for: ", activity, userToday, lastUpdated);
  const clientToday = DateTime.fromISO(userToday, {setZone: true});
  console.log("using zone: ", clientToday.zone);
  const userLastUpdated = DateTime.fromISO(lastUpdated, {zone: clientToday.zone}); // use the user's local time zone
  console.log("user last updated: ", userLastUpdated);
  // Last monday with up to date data. Get all records from this date until the next sunday after today
  // (unless today is sunday then just till today)
  var resBody = {
    success: false,
    message: 'default error message...'
  };
  var userID;
  try {
    userID = (await jwt.verify(userToken, secret))._id;
  } catch(e) {
    return sendError(response, e);
  }
  // Query the latest upload. Change -1 to 1 to get the oldest
  var ActivityData = getModel(activity);

  // don't include the __v:, uploadDate, userID, _id fields
  var projection = {__v: false,}
  ActivityData
    .find({
      userID,
      uploadDate: {
        $gte: userLastUpdated
      }
    }, projection)
    .sort({'uploadDate': 1})
    .limit(MAX_DOCUMENTS)
    .exec(function(err, data) {
      if (err) {
        resBody.message = err.toString
        return response.send({
          success: false,
          message: err.toString()
        });
      }
      // console.log("queried result is: ", data)
      var sessions = []; // A list of session objects for run/jump/swim. Each session object is 1 day.
      if (data !== null) {
        sessions = JSON.parse(JSON.stringify(data));
      }
      const today = DateTime.fromObject({zone: clientToday.zone});
      const nextSunday = getNextSunday(today); // hours are set to 0,0,0,0 so all comps done by date
      var weekBuffer = []; // list that holds a weeks worth of data. Flush it to the result when it fills up.
      var activityData = []; // List of lists. Each sublist is a week with session data.
      var lastSession = getLastMonday(userLastUpdated); // hours are set to 0,0,0,0 so all comps done by date
      // console.log("last monday from last session: ", lastSession);
      sessions.forEach(session => {
        // add daily fitness data (even if it's empty) up through the date of the session
        const nextSessionDate = DateTime.fromISO(session.uploadDate, {zone: clientToday.zone}).set({
          hour: 0, minute: 0,  second: 0, millisecond: 0
        });
        console.log("next session date: ", nextSessionDate.toISO());
        while (lastSession < nextSessionDate) { // lt or equal in terms of day, month, year
          weekBuffer.push(activityToSession(activity, lastSession, userID));
          // console.log(weekBuffer[weekBuffer.length - 1]);
          if (weekBuffer.length >= 7) {
            activityData.push([...weekBuffer]); // must be a copy not a direct reference
            weekBuffer = [];
          }
          lastSession = lastSession.plus({day:1});
        }
        if (!sameDate(lastSession, nextSessionDate)) {
          console.error("last session and next session date should be equal: ", lastSession, nextSessionDate)
        }
        weekBuffer.push(session); // should now be the current session
        if (weekBuffer.length >= 7) {
          activityData.push([...weekBuffer]);
          weekBuffer = [];
        }
        lastSession = lastSession.plus({day: 1}); // go to the next session's date and add 1
      });
      while (lastSession <= nextSunday) { // must be up THROUGH the next sunday after today
        weekBuffer.push(activityToSession(activity, lastSession, userID));
        if (weekBuffer.length >= 7) {
          activityData.push([...weekBuffer]);
          weekBuffer = [];
        }
        lastSession = lastSession.plus({day: 1});
      }
      if (weekBuffer.length != 0) {
        console.error("week buffer should be empty but it is not!", weekBuffer);
        return response.send({
          success: false,
          message: "week buffer should be empty but it is not!",
        });
      } else { // for some reason you need this else tf
        reverse(activityData);
        response.send({
          success: true,
          activityData,
        });
      }
    });
});

/**
 * Backend route that takes in a list of scrambled byte arrays, unscrambles them, decodes them
 * into session statistics, and updates the user's fitness in the Mongo DB.
 */
router.post("/upload", async (req, res) => {
  const { date, sessionBytes, userToken } = req.body;
  // fs.writeFile('sadata.txt', Buffer.from(sessionBytes, 'base64'), (err) => console.log("finished writing sadata", err));
  // console.log(date, sessionBytes, userToken);
  var userID;
  try {
    userID = await jwt.verify(userToken, secret)
    userID = userID._id;
  } catch(e) {
    return sendError(res, e);
  }
  console.log("date that user sent: ", date);
  const sessionDateMidnight = DateTime.fromISO(date, {setZone: true}).set({
    hour: 0, minute: 0, second: 0, millisecond: 0
  });
  console.log("session date midnight: ", sessionDateMidnight);
  const nextDayMidnight = sessionDateMidnight.plus({day: 1});
  console.log("next day midnight: ", nextDayMidnight);
  const sessionDateMidnightJS = sessionDateMidnight.toJSDate();
  const nextDayMidnightJS = nextDayMidnight.toJSDate();
  const rawBytes = Buffer.from(sessionBytes, 'base64');
  const unscrambledBytes = unscrambleSessionBytes(rawBytes);
  const sessionJsons = createSessionJsons(unscrambledBytes, userID, sessionDateMidnightJS);
  console.log("To js: ", sessionDateMidnightJS, nextDayMidnightJS);
  const {run, swim, jump} = sessionJsons;
  console.log("session jsons: ", sessionJsons);
  // begin mongo transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // update any run sessions
    var runSession = await Run.findOne({
      userID: userID,
      uploadDate: {
        $gte: sessionDateMidnightJS,
        $lt: nextDayMidnightJS,
      }
    }).session(session);
    // console.log("runSession: ", runSession);
    if (runSession) {
      if (Array.isArray(runSession)) {
        runSession = runSession[0];
      }
      runSession.num += run.num;
      runSession.cadences.push(...run.cadences);
      runSession.calories += run.calories;
      runSession.time += Math.ceil(run.time);
      await runSession.save();
    } else {
      if (run.time > 0) {
        console.log("saving new run session...");
        const newRunSession = new Run(run);
        await newRunSession.save();
      }
    }
    // update any swim sessions
    var swimSession = await Swim.findOne({
      userID: userID,
      uploadDate: {
        $gte: sessionDateMidnightJS,
        $lt: nextDayMidnightJS,
      }
    }).session(session);
    // console.log("swimSession: ", swimSession);
    if (swimSession) {
      if (Array.isArray(swimSession)) {
        swimSession = swimSession[0];
      }
      swimSession.num += swim.num;
      swimSession.strokes.push(...swim.strokes);
      swimSession.lapTimes.push(...swim.lapTimes);
      swimSession.calories += swim.calories;
      swimSession.time += Math.ceil(swim.time);
      await swimSession.save();
    } else {
      if (swim.time > 0) {
        console.log("saving new swim session...");
        const newSwimSession = new Swim(swim);
        await newSwimSession.save();
      }
    }
    // update any jump sessions
    var jumpSession = await Jump.findOne({
      userID: userID,
      uploadDate: {
        $gte: sessionDateMidnightJS,
        $lt: nextDayMidnightJS,
      }
    }).session(session);
    console.log("jumpSession: ", jumpSession);
    if (jumpSession) {
      if (Array.isArray(jumpSession)) {
        jumpSession = jumpSession[0];
      }
      jumpSession.num += jump.num;
      jumpSession.heights.push(...jump.heights);
      jumpSession.shotsMade += jump.shotsMade;
      jumpSession.time += Math.ceil(jump.time);
      await jumpSession.save();
    } else {
      if (jump.time > 0) {
        console.log("saving new jump session...");
        const newJumpSession = new Jump(jump);
        await newJumpSession.save();
      }
    }

    // update the user nEfforts, thresholds, etcs
    const user = await User.findOne({
      _id: userID,
    }).session(session);
    // console.log("user: ", user);
    // user had to swim for 8 or more laps
    if (swim.lapTimes.length >= 8) {
      user.referenceTimes = calcReferenceTimes(user.referenceTimes, swim);
      const oldAverageNumLaps = user.swimEfforts[0] / 0.2;
      const newMovingAvgNumLaps = (7 * oldAverageNumLaps)/8 + swim.lapTimes.length/8;
      user.swimEfforts = [
        newMovingAvgNumLaps * .2, // level 1
        newMovingAvgNumLaps * .3, // level 2
        newMovingAvgNumLaps * .4, // level 3
        newMovingAvgNumLaps * .6, // level 4
      ];
    }
    // user had to run for 3 or more minutes for run efforts to be updated
    if (run.cadences.length >= 6) {
      const oldAvgNumHalfMins = user.runEfforts[0] / 0.1;
      const newAvgNumHalfMins = (7 * oldAvgNumHalfMins)/8 + run.cadences.length/8;
      user.runEfforts = [
        newAvgNumHalfMins * .1,  // level 1
        newAvgNumHalfMins * .25, // level 2
        newAvgNumHalfMins * .50, // level 3
        newAvgNumHalfMins * .70, // level 4
      ];
    }

    // update user bests
    user.bests = {
      mostCalories: Math.max(user.bests.mostCalories, run.calories, swim.calories),
      mostSteps: Math.max(user.bests.mostSteps, run.num),
      mostLaps: Math.max(user.bests.mostLaps, swim.num),
      highestJump: Math.max(user.bests.highestJump, Math.max(jump.heights)),
      bestEvent: user.bests.bestEvent // don't do anything about the best event yet
    };

    await user.save();

    // commit the changes if everything was successful
    await session.commitTransaction();
    // send success response back to client
    return res.send({
      success: true,
      message: `Successfully updated your fitness!`
    });
  } catch(e) {
    console.log('Error in updating your fitness: ', e.toString());
    // this will rollback any changes made in the database
    await session.abortTransaction();
    return sendError(res, e.toString());
  } finally {
    session.endSession();
  }
});

module.exports = router;