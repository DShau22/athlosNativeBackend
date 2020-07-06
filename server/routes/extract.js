// extracts the bearer: token header and puts it in the req body

module.exports = function extractToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  // Check if bearer is undefined
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next()
  } else {
    return res.send({
      success: false,
      message: 'Error: no token was sent'
    })
  }
}
