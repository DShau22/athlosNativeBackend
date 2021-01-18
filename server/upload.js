const IncomingForm = require('formidable').IncomingForm
const fs = require('fs')
const reader = require("./fileReaders/reader")
const jsonMaker = require("./jsonMaker")
const path = require("path")
const dataPath = "./Data/"
const jumpPath = "jump/"
const runPath = "run/"
const date = new Date()
const jwt = require("jsonwebtoken")
const secret = 'secretkey'

const {User, Swim, Run, Jump} = require("./database/MongoConfig")

// saves a given doc if it is not null
function saveData(doc) {
  if (!doc) {
    return new Promise((resolve, reject) => {reject(new Error("doc is null or undefined"))})
  }
  if (doc.num === 0) {
    // return a dummy promise with the default json schema
    return new Promise((resolve, reject) => {
      resolve(doc)
    })
  }
  return new Promise((resolve, reject) => {
    doc.save((err, activity) => {
      if (err) {
        reject(err)
      }
      resolve(activity)
    })
  })
}

// updates the run, swim, jump collections and the user's 
// bests and totals
async function update(userID, jumpJson, runJson, swimJson) {

  // console.log("swimJson: ", swimJson)
  // console.log("runJson: ", runJson)
  // console.log("jumpJson: ", jumpJson)

  // create documents using the jsons from the request body
  // return the original default json if the number is 0 (user didn't do any activity)
  var runDoc = (runJson.num === 0) ? runJson : new Run(runJson)
  var jumpDoc = (jumpJson.num === 0) ? jumpJson : new Jump(jumpJson)
  var swimDoc = (swimJson.num === 0) ? swimJson : new Swim(swimJson)

  var errors = { success: true, messages: [] }
  // save to database collections runs, jumps, swims
  var savedRun;
  var savedJump;
  var savedSwim;
  try {
    // if saveData is passed the default json it will just return the default
    [
      savedRun,
      savedJump, 
      savedSwim
    ] = await Promise.all([saveData(runDoc), saveData(jumpDoc), saveData(swimDoc)]);
    console.log(savedRun)
    console.log(savedJump)
    console.log(savedSwim)
    console.log("saved run, swim, jump data")
    errors.messages.push('saved all activity data successfully')
  } catch(e) {
    console.error(e)
    errors.success = false
    errors.messages.push(e.toString())
  }

  // update the bests and totals next
  try {
    let filter = {_id: userID}
    let update = { 
      $max: {
        'bests.jump': Math.max(savedJump.heights),
        'bests.run': Math.max(savedRun.num),
      },
      $inc: {
        'totals.steps': savedRun.num,
        'totals.laps': savedSwim.num,
        'totals.verticalJumps': savedJump.num,
        'totals.sessions': 1,
        'totals.minutes': savedJump.time + savedSwim.time + savedRun.time,
        'totals.calories': savedRun.calories + savedSwim.calories  // jumping doesnt count calories
      },
    }
    console.log("updating user")
    var newUser = await User.findOneAndUpdate(filter, update)
    console.log('updated user bests')
  } catch(e) {
    // delete the run, swim, jump entries if they were saved
    console.error(e)
    errors.success = false
    errors.messages.push(e.toString())
    try {
      console.log("deleting...")
      await Promise.all([Run.findOneAndDelete({userID: userID}),
                        Jump.findOneAndDelete({userID: userID}),
                        Swim.findOneAndDelete({userID: userID})])
    } catch(e) {
      console.err(e.toString())
      errors.messages.push(e.toString())
    }
  }
  return errors
}

function parseAuthHeader(auth) {
  const bearer = auth.split(' ');
  // Get token from array
  const bearerToken = bearer[1];
  return bearerToken
}

module.exports = async function upload(req, res, next) {
  console.log("upload: ", req.body);
  res.send({
    success: false,
    message: 'test',
  });
  // var form = new IncomingForm()
  // // i dont think form.parse or jwt.verify can return promises :(
  // form.parse(req, async function(err, fields, files) {
  //   if (err) throw err
  //   console.log("parsing form...")
  //   //console.log(files)
  //   var converted;
  //   // convert encoded file to correct byte file
  //   try {
  //     var filePath = files.uploadedFile.path
  //     converted = await reader.unscrambleSessionBytes(filePath)
  //   } catch(e) {
  //     console.log("error converted the uploaded file")
  //     throw e
  //   }

  //   jwt.verify(parseAuthHeader(req.headers['authorization']), secret, async function(err, decoded) {
  //     console.log("verifying...")
  //     // invalid token!
  //     if (err) {
  //       console.error(err)
  //       return res.send({
  //         success: false,
  //         messages: [err.toString()]
  //       })
  //     }

  //     console.log("decoded is: ", decoded)
  //     // pass the converted byte file and the decoded _id to make activity jsons
  //     try {
  //       var activityJson = jsonMaker.toJson(converted, decoded._id)
  //       var jumpJson = activityJson.jumpJson
  //       var runJson = activityJson.runJson
  //       var swimJson = activityJson.swimJson
  //     } catch (e) {
  //       console.error(e)
  //       return res.send({
  //         success: false,
  //         messages: [e.toString()]
  //       })
  //     }

  //     var result = await update(decoded._id, jumpJson, runJson, swimJson)
  //     if (result.success) {
  //       return res.send({
  //         success: true,
  //         messages: ['successfully updated your recent activities']
  //       })
  //     } else {
  //       // something went wrong with uploading the database. Probably schema didn't match
  //       return res.status(500).send(result)
  //     }
  //   })
  // })
}
