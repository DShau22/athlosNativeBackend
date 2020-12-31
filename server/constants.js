const CONSTANTS = {
  SECRET: 'secretkey',
  sendError: (res, err) => {
    return res.send({
      success: false,
      message: err.toString(),
    })
  },
  emptyRunSession: {
    _id: '',
    userID: '',
    uploadDate: new Date(),
    num: 0,
    cadences: [],
    calories: 0,
    time: 0
  },
  emptySwimSession: {
    _id: '',
    userID: '',
    uploadDate: new Date(),
    num: 0,
    lapTimes: [],
    strokes: [],
    calories: 0,
    time: 0
  },
  emptyJumpSession: {
    _id: '',
    userID: '',
    uploadDate: new Date(),
    num: 0,
    heights: [],
    calories: 0,
    time: 0
  },
}
module.exports = CONSTANTS