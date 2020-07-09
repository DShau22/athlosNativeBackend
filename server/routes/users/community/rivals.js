const constants = require('../../../constants')
const { sendError, SECRET } = constants
const mongoConfig = require("../../../database/MongoConfig")
const { User } = mongoConfig
const mongoose = require('mongoose')
const jwt = require("jsonwebtoken")

// sends a request to rival someone
const sendRivalRequest = (req, res) => {

}

// accepts rival request
const acceptRivalRequest = (req, res) => {

}

// rejects the rival request
const rejectRivalRequest = (req, res) => {

}

// ends rivalry between the two (whoever ends it loses)
const endRivalry = (req, res) => {

}