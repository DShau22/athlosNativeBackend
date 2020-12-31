const {
  parseDate,
  getLastMonday,
  getNextSunday,
  sameDate,
} = require('../utils/dates');

const {
  emptyRunSession,
  emptyJumpSession,
  emptySwimSession, 
} = require('../constants');
const express = require('express')
const extractToken = require("./extract")
const router = express.Router()

const mongoConfig = require("../database/MongoConfig")
const secret = 'secretkey'
const jwt = require("jsonwebtoken")

// maximum number of activity documents to query for a given activity
const MAX_DOCUMENTS = 26;

function getModel(activity) {
  switch(activity) {
    case "jump":
      return mongoConfig.Jump
    case "run":
      return mongoConfig.Run
    case "swim":
      return mongoConfig.Swim
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
        uploadDate,
        num: 0,
        cadences: [],
        calories: 0,
        time: 0
      }
    case "swim":
      return {
        _id: '',
        userID,
        uploadDate,
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
        uploadDate,
        num: 0,
        heights: [],
        calories: 0,
        time: 0
      }
  }
};

router.get("/getUserFitness", extractToken, (request, response, next) => {
  const tokenizedID = request.token;
  const activity = request.headers["activity"];
  // Last monday with up to date data. Get all records from this date until the next sunday after today
  const lastUpdated = new Date(parseFloat(request.headers["last_updated"])); 
  var resBody = {
    success: false,
    message: 'default error message...'
  }
  jwt.verify(tokenizedID, secret, (err, decoded) => {
    const userID = decoded._id;
    // allows the user to get data even if token is expired
    if (err) {
      resBody.message = err.toString();
      if (err.name === 'TokenExpiredError') {
        resBody.message = "Your session has expired. Please sign in again for security purposes."
      }
      return;
    }
    // Query the latest upload. Change -1 to 1 to get the oldest
    var ActivityData = getModel(activity)

    // don't include the __v:, uploadDate, userID, _id fields
    var projection = {__v: false,}
    ActivityData
      // finds the userID where the decoded token(_id) matches userID field
      .find({
        userID,
        uploadDate: {
          $gt: lastUpdated
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
        console.log("queried result is: ", data)
        var sessions = [] // A list of session objects for run/jump/swim. Each session object is 1 day.
        if (data !== null) {
          sessions = JSON.parse(JSON.stringify(data));
        }
        const today = new Date();
        const nextSunday = getNextSunday(today); // hours are set to 0,0,0,0 so all comps done by date
        var weekBuffer = []; // list that holds a weeks worth of data. Flush it to the result when it fills up.
        var activityData = []; // List of lists. Each sublist is a week with session data.
        var lastSession = getLastMonday(lastUpdated); // hours are set to 0,0,0,0 so all comps done by date
        sessions.forEach(session => {
          // add daily fitness data (even if it's empty) up through the date of the session
          const nextSessionDate = new Date(session.uploadDate);
          nextSessionDate.setHours(0, 0, 0, 0);
          while (lastSession < nextSessionDate) { // lt or equal in terms of day, month, year
            weekBuffer.push(activityToSession(activity, new Date(lastSession.getTime()), userID));
            if (weekBuffer.length >= 7) {
              activityData.push([...weekBuffer]); // must be a copy not a direct reference
              weekBuffer = [];
            }
            lastSession.setDate(lastSession.getDate() + 1);
          }
          if (!sameDate(lastSession, nextSessionDate)) {
            console.error("last session and next seesion date should be equal: ",lastSession, nextSessionDate)
          }
          weekBuffer.push(session); // should now be the current session
          if (weekBuffer.length >= 7) {
            activityData.push([...weekBuffer]);
            weekBuffer = [];
          }
          lastSession.setDate(nextSessionDate.getDate() + 1);
        });
        while (lastSession <= nextSunday) { // must be up THROUGH the next sunday after today
          weekBuffer.push(activityToSession(activity, new Date(lastSession.getTime()), userID));
          if (weekBuffer.length >= 7) {
            activityData.push([...weekBuffer]);
            weekBuffer = [];
          }
          lastSession.setDate(lastSession.getDate() + 1);
        }
        if (weekBuffer.length != 0) {
          console.error("week buffer should be empty but it is not!", weekBuffer);
          return response.send({
            success: false,
            message: "week buffer should be empty but it is not!",
          });
        } else { // for some reason you need this else tf
          console.log(activityData);
          reverse(activityData);
          response.send({
            success: true,
            activityData,
          });
        }
      });
  });
});

// IDK WHY I WROTE THIS HUH
// router.post("/getUserActivityData", async (request, response) => {
//   console.log("got request")
//   var { activity, userID } = request.body

//   // Query the latest upload. Change -1 to 1 to get the oldest
//   var ActivityData = getModel(activity.toLowerCase())
//   // don't include the __v:, uploadDate, userID, _id fields
//   var projection = {__v: false,}
//   ActivityData
//     // finds the userID where the decoded token(_id) matches userID field
//     .find({userID: userID}, projection)
//     .sort({'uploadDate': -1})
//     .exec(function(err, data) {
//       if (err) throw err
//       console.log("queried result is: ", data)
//       var activityData = [] // A list of session objects for run/jump/swim. Each session object is 1 day.
//       if (data !== null) {
//         activityData = JSON.parse(JSON.stringify(data))
//       }
//       // send request object with queried data written to the body
//       response.send({
//         success: true,
//         activityData,
//       })
//     })
// })

module.exports = router
