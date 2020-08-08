const express = require('express')
const extractToken = require("./extract")
const router = express.Router()

const mongoConfig = require("../database/MongoConfig")
const secret = 'secretkey'
const jwt = require("jsonwebtoken")

// maximum number of activity documents to query for a given activity
const MAX_DOCUMENTS = 50

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

router.get("/getUserFitness", extractToken, (request, response, next) => {
  var tokenizedID = request.token
  var activity = request.headers["activity"]

  jwt.verify(tokenizedID, secret, (err, decoded) => {
    // allows the user to get data even if token is expired
    if (err) {
      var message = err.toString();
      if (err.name === 'TokenExpiredError') {
        message = "Your session has expired. Please sign in again for security purposes."
      }
      return response.send({
        success: false,
        message,
      })
    }
    // Query the latest upload. Change -1 to 1 to get the oldest
    var ActivityData = getModel(activity)

    // don't include the __v:, uploadDate, userID, _id fields
    var projection = {__v: false,}
    ActivityData
      // finds the userID where the decoded token(_id) matches userID field
      .find({userID: decoded}, projection)
      .limit(MAX_DOCUMENTS)
      .sort({'uploadDate': -1})
      .exec(function(err, data) {
        if (err) throw err
        console.log("queried result is: ", data)

        // Define to JSON type
        var jsonContent = JSON.parse(JSON.stringify(data))
        // send request object with queried data written to the body
        response.send({
          success: true,
          activityData: jsonContent
        })
      })
  })
})

router.post("/getSearchUserFitness", async (request, response) => {
  console.log("got request")
  var { activity, friendID } = request.body

  // Query the latest upload. Change -1 to 1 to get the oldest
  var ActivityData = getModel(activity.toLowerCase())
  // don't include the __v:, uploadDate, userID, _id fields
  var projection = {__v: false,}
  ActivityData
    // finds the userID where the decoded token(_id) matches userID field
    .find({userID: friendID}, projection)
    .sort({'uploadDate': -1})
    .exec(function(err, data) {
      if (err) throw err
      console.log("queried result is: ", data)
      var activityData = []
      if (data !== null) {
        activityData = JSON.parse(JSON.stringify(data))
      }
      // send request object with queried data written to the body
      response.send({
        success: true,
        activityData,
      })
    })
})

module.exports = router
