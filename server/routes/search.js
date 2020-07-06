const { sendError } = require("../utils/errors")
// express router imports
const express = require('express')
const router = express.Router()

// imports for mongo
const mongoConfig = require("../database/MongoConfig")
const { User } = mongoConfig
const jwt = require("jsonwebtoken")
const secret = 'secretkey'

router.post("/searchUser", (req, res) => {
  var { searchText, userToken } = req.body

  jwt.verify(userToken, secret, (err, decoded) => {
    if (err) {
      return sendError(res, err)
    }

    // perform text search on user first and last name
    // only return users that are registered, not equal to itself
    User.find(
      {"$text": {"$search": searchText}},
      {"score": { "$meta": "textScore"}},
    )
      .limit(10)
      .where('_id').ne(decoded._id)
      .where('registered').equals(true)
      .select({"firstName": 1, "lastName": 1, "_id": 1, "username": 1, "bests": 1, 'profilePicture': 1})
      .sort({"score": {"$meta": "textScore"}})
      .exec(async (err, users) => {
        if (err) {
          console.error(err)
          sendError(res, err)
        }
        // let { friends } = await User.findOne({_id: decoded._id}, 'friends')
        // label each user as a friend or not a friend of the one who is searching
        // users.forEach((user, idx) => {
        //   friends.forEach((friend, idx) => {
        //     if (user._id === friend.id) {
        //       user.isFriend = true
        //     }
        //     user.isFriend = false
        //   })
        // })
        return res.send({ success: true, users })
      })
  })
})

module.exports = router
