const express = require('express')
const cors = require('cors')
const app = express()
const fs = require('fs')
const { DateTime } = require('luxon')
// for env vars
const dotenv = require('dotenv')
dotenv.config()

//db stuff
const mongoose = require('mongoose')
const mongoLocalURL = 'mongodb://localhost:27017/tracker_dev'
const pw = process.env.MONGO_PASSWORD
const database = "fitness-tracker"
const mongoServerURL = `mongodb+srv://dshau22:${pw}@fitness-dev-r2ryq.mongodb.net/${database}?retryWrites=true&w=majority`

const upload = require('./upload')

// wrap async functions you pass into express routers with this so no silent errors
const { asyncMiddleware } = require('./utils/asyncMiddleware')

// web sockets
const socket = require("socket.io")

const jwt = require("jsonwebtoken")

// routers
const loginRouter = require("./routes/loginServer")
const activityRouter = require("./routes/activities")
const emailRouter = require("./routes/emails")
const searchRouter = require("./routes/search")
const userSettings = require("./routes/users/userSettings")
const searchUsers = require("./routes/users/searchUsers")
const usersGeneral = require("./routes/users/usersGeneral")
const userFriends = require("./routes/users/userFriends")
const profilePic = require("./routes/users/profilePic")
// initialize object that maps userIDs to a set of sockets
var idMap = {}
console.log("AOWIJDOAIJWD", DateTime.local())
// configure and use cors options
// CHANGE THIS LATER AT SOME POINT
var corsOptions = {
  origin: '*',
//   origin: 'http://localhost:3000',
  // optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

// make sure to enable body parser for req and res bodies
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// routes for login and sign up
app.use('/', loginRouter)
app.use('/', activityRouter)
app.use('/', emailRouter)
app.use('/', searchRouter)
app.use('/', usersGeneral)
app.use('/', userSettings)
app.use('/', searchUsers)
app.use('/', usersGeneral)
app.use('/', userFriends)
app.use('/', profilePic)
// add route methods for dashboard
app.post('/upload', asyncMiddleware(upload))

// function emitMultiple(io, socketSet, socketEvent, data) {
//   // have all of the sockets emit if they are present
//   socketSet.forEach((socket, idx) => {
//     io.to(`${socket.id}`).emit(socketEvent, data)
//   })
// }

// function emitMultipleAndDisconnect(io, socketSet, socketEvent, data) {
//   // have all of the sockets emit
//   socketSet.forEach((socket, idx) => {
//     io.to(`${socket.id}`).emit(socketEvent, data)
//     // disconnect socket
//     socket.disconnect()
//   })
// }

const httpsOptions = {
  key: fs.readFileSync('./security/localhost+2-key.pem'),
  cert: fs.readFileSync('./security/localhost+2.pem')
}

// set up a connection to database
console.log("connecting to mongo...")
mongoose.connect(mongoServerURL, { useNewUrlParser: true, useFindAndModify: false })
  .catch(function(err) {throw err})

mongoose.connection.once("open", function() {
  console.log("successfully connected to mongo")

  // get server instance for socket.io
  // const server = require('http').createServer(app);
  const server = require('https').createServer(httpsOptions, app);
  // const server = app.listen(8080, () => {
  //   console.log('app started!')
  // })

  // establish socket setup
  // var io = socket(server, { origins : '*:*' })
  // io.origins('*:*')
  // io.on("connection", (socket) => {
  //   console.log("socket connection made", socket.id)

  //   socket.on("sendUserID", (data) => {
  //     var { userID } = data
  //     // bind user ID to socket instance to use in disconnect
  //     socket.userID = userID
  //     // add socket to set corresponding to the userID
  //     if (!idMap[userID]) {
  //       idMap[userID] = new Set()
  //     }
  //     idMap[userID].add(socket)
  //     console.log("userid socket set size is: ", idMap[userID].size)
  //   })

  //   socket.on('disconnect', (data) => {
  //     var { userID } = socket
  //     // remove socket instance from socket set associated with userID
  //     idMap[userID].delete(socket)
  //     console.log("disconncted: ", socket.id, userID, idMap[userID].size)
  //   })

  //   socket.on("acceptFriendRequest", (data) => {
  //     // data should contain the person who accepted the request's
  //     // id, first name, last name, and the new friend's id
  //     var { userID, userFirstName, userLastName, otherFriendID } = data
  //     var newFriendSocketSet = idMap[otherFriendID]
  //     console.log("accept friend request: ", newFriendSocketSet)

  //     // have all of the new friend's sockets emit if they're connected
  //     if (newFriendSocketSet) {
  //       emitMultiple(io, newFriendSocketSet, "newFriend", data)
  //     }
  //   })

  //   socket.on("sendFriendRequest", (data) => {
  //     // data should contain the request sender's
  //     // id, firstname, lastname, and receiver's userID
  //     var { senderID, senderFirstName, senderLastName, receiverID } = data
  //     var receiverSocketSet = idMap[receiverID]
  //     console.log("send Friend Request: ", receiverSocketSet)

  //     // have all of the receiver's sockets emit if they're connceted
  //     if (receiverSocketSet) {
  //       emitMultiple(io, receiverSocketSet, "receiveFriendRequest", data)
  //     }
  //   })

  //   socket.on("logoutServer", (data) => {
  //     //data should contain user token
  //     var { userToken } = data
  //     // decode token to get userID. Shouldn't be an issue since you're just logging out
  //     var userID = jwt.decode(userToken)._id
  //     // get array of sockets corresponding to user
  //     var userSocketsSet = idMap[userID]
  //     // this data contains the socketID that emitted the loggout out
  //     // allows other tabs to alert using that some other tab logged out
  //     var emitData = { logoutSocketID: socket.id}
  //     if (userSocketsSet) {
  //       emitMultipleAndDisconnect(io, userSocketsSet, "logoutClient", emitData)
  //     }
  //     // remove this user from map
  //     delete idMap[userID]
  //   })
  // })

  server.listen(3000)
})
module.exports = {
  app,
}