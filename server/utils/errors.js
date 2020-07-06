function sendError(res, err) {
  return res.send({
    success: false,
    messages: [err.toString()]
  })
}

module.exports = {
  sendError
}