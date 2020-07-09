const CONSTANTS = {
  SECRET: 'secretkey',
  sendError: (res, err) => {
    return res.send({
      success: false,
      message: err.toString(),
    })
  }
}
module.exports = CONSTANTS