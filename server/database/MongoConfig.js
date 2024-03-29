const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema

const DEFAULT_GOALS = {
  goalSteps: 20000,
  goalLaps: 50,
  goalVertical: 12,
  goalCaloriesBurned: 2000,
  goalWorkoutTime: 180,
};

const DEFAULT_REF_TIMES = {
  fly: [22, 20],
  back: [30, 26],
  breast: [32, 28],
  free: [25, 22]
};

const DEFAULT_CADENCES = [30, 46, 73];

const DEFAULT_RUN_EFFORTS = [1, 2.5, 5, 7]; // efforts inc/dec after 30 second intervals
const DEFAULT_WALK_EFFORTS = [1, 2.5, 5, 7]; // efforts inc/dec after 30 second intervals

const DEFAULT_SWIM_EFFORTS = [4, 8, 12, 16]; // efforts increment after turns

const JumpSchema = new Schema({
  userID: {
    type: String,
    required: true,
    default: '',
  },
  uploadDate: {
    type: Date,
    required: true,
  },
  num: {
    type: Number,
    required: true,
    default: 0,
  },
  heights: {
    type: [Number],
    required: true,
    default: [],
  },
  shotsMade: {
    type: Number,
    required: true,
    default: 0,
  },
  time: {
    type: Number,
    required: true,
    default: 0
  },
  goalVertical: {
    type: Number,
    required: true,
    default: DEFAULT_GOALS.goalVertical,
  }
})

const RunSchema = new Schema({
  userID: {
    type: String,
    required: true,
    default: '',
  },
  uploadDate: {
    type: Date,
    required: true,
  },
  num: {
    type: Number,
    required: true,
    default: 0,
  },
  time: {
    type: Number,
    required: true,
    default: 0,
  },
  cadences: {
    type: Array,
    required: true,
    default: []
  },
  calories: {
    type: Number,
    required: true,
    default: 0,
  },
  goalSteps: {
    type: Number,
    required: true,
    default: DEFAULT_GOALS.goalSteps,
  },
});

const SwimSet = new Schema({
  reps: {
    type: Number,
    required: true,
    default: 0,
  },
  distance: {
    type: Number,
    required: true,
    default: 0,
  },
  event: {
    type: String,
    required: true,
    default: "free",
  },
  timeIntervalInSeconds: {
    type: Number,
    required: true,
    default: 0,
  },
});

const SwimWorkoutSchema = new Schema({
  sets: {
    type: [SwimSet],
    required: true,
    default: [],
  },
  totalNumSwimsIntended: {
    type: Number,
    required: true,
    default: 0,
  },
  totalNumRoundsIntended: {
    type: Number,
    required: true,
    default: 0,
  }
});

const SwimSchema = new Schema({
  userID: {
    type: String,
    required: true,
    default: '',
  },
  uploadDate: {
    type: Date,
    required: true,
  },
  num: {
    type: Number,
    required: true,
    default: 0,
  },
  // each entry an obj. Stores lap time, and whether the user took a rest
  // after the lap or not
  // {
  //    lapTime: Number, 
  //    finished: Boolean
  // }
  lapTimes: {
    type: [Object],
    required: true,
    default: [],
  },
  // each entry is the stroke the user did during that lap
  strokes: {
    type: [String],
    required: true,
    default: [],
  },
  calories: {
    type: Number,
    required: true,
    default: 0,
  },
  // the overall swim session time
  time: {
    type: Number,
    required: true,
    default: 0
  },
  goalLaps: {
    type: Number,
    required: true,
    default: DEFAULT_GOALS.goalLaps,
  },
  poolLength: {
    type: String,
    required: false,
  },
  // boolean for if this is a swimming workout or just lap swimming
  workouts: {
    type: [SwimWorkoutSchema],
    required: false
  },
  isLapSwimMode: {
    type: Boolean,
    required: true,
    default: true,
  },
})

const IntervalWorkoutSchema = new Schema({
  intervalsCompleted: {
    type: [Object],
    required: true,
    default: [],
  },
  workoutName: {
    type: String,
    required: true,
    default: "My HIIT Workout"
  },
  totalRoundsPlanned: {
    type: Number,
    required: true,
    default: 0,
  },
  intervalsPerRoundPlanned: {
    type: Number,
    required: true,
    default: 0,
  },
  workoutTime: {
    type: Number,
    required: true,
    default: 0,
  }
});

const IntervalSchema = new Schema({
  workouts: [IntervalWorkoutSchema],
  userID: {
    type: String,
    required: true,
    default: '',
  },
  uploadDate: {
    type: Date,
    required: true,
  },
  time: {
    type: Number,
    required: true,
    default: 0
  },
})

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    index: { unique: true }, // will search by email
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    default: ''
  },
  firstName: {
    type: String,
    required: true,
    default: ''
  },
  lastName: {
    type: String,
    required: true,
    default: ''
  },
  deviceID: {
    type: String,
    required: false,
    default: ''
  },
  registerDate: {
    type: Date,
    required: false,
    default: new Date('January 1, 1970 00:00:00'),
  },
  registered: {
    type: Boolean,
    required: false,
    default: false,
  },
  age: {
    type: Number,
    required: false,
    default: 0
  },
  // Below are arrays for followers, following, and rivals. They are arrays of objects that contain
  // id, fname, lname, profilepicUrl
  followers: {
    type: Array,
    required: false,
    default: []
  },
  following: {
    type: Array,
    required: false,
    default: []
  },
  // array of athletes this user has requested to follow
  followingPending: {
    type: Array,
    required: false,
    default: []
  },
  // array of athletes that have requested to follow this user
  followerRequests: {
    type: Array,
    required: false,
    default: []
  },
  rivals: {
    type: Array,
    required: false,
    default: []
  },
  // array of athletes this user has requested to rival
  rivalsPending: {
    type: Array,
    required: false,
    default: []
  },
  // array of athletes that have requested to rival this user
  rivalRequests: {
    type: Array,
    required: false,
    default: []
  },
  bio: {
    type: String,
    required: false,
    default: ""
  },
  height: {
    type: Number,
    required: false,
    default: 0
  },
  weight: {
    type: Number,
    required: false,
    default: 0
  },
  gender: {
    type: String,
    required: false,
    default: ""
  },
  profilePicture: {
    type: Object,
    required: false,
    default: {
      profileURL: "",
      etag: ""
    }
  },
  location: {
    type: String,
    required: false,
    default: ""
  },
  bests: {
    type: Object,
    required: false,
    default: {
      highestJump: 0,
      mostSteps: 0,
      mostLaps: 0,
      mostCalories: 0,
      bestEvent: {}
    }
  },
  totals: {
    type: Object,
    required: false,
    default: {
      steps: 0,
      laps: 0,
      verticalJumps: 0,
      shotsTaken: 0,
      buckets: 0,
      jumpRopes: 0,
      sessions: 0,
      minutes: 0,
      calories: 0,
    }
  },
  settings: {
    type: Object,
    required: false,
    default: {
      unitSystem: "english", // english, metric
      poolLength: "25 yd", // 25 yd, 50 m, 25 m, or some custom text like 33.3 yd
      seeCommunity: "everyone",
      seeFitness: "everyone", //everyone, followers, only me
      seeBasicInfo: "everyone", //everyone, followers, only me,
      seeBests: "everyone",
      seeTotals: "everyone",
    },
  },
  goals: {
    type: Object,
    required: false,
    default: DEFAULT_GOALS,
  },
  referenceTimes: {
    type: Object,
    required: false,
    default: DEFAULT_REF_TIMES,
  },
  swimEfforts: {
    type: Array,
    required: false,
    default: DEFAULT_SWIM_EFFORTS,
  },
  runEfforts: {
    type: Array,
    required: false,
    default: DEFAULT_RUN_EFFORTS,
  },
  walkEfforts: {
    type: Array,
    required: false,
    default: DEFAULT_WALK_EFFORTS,
  },
  cadenceThresholds: {
    type: Array,
    required: false,
    default: DEFAULT_CADENCES,
  }
});

//add text indices for searching
UserSchema.index({firstName: 'text', lastName: 'text'})

// security for passwords
UserSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
}
UserSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password)
}

const User = mongoose.model('user', UserSchema)
const Swim = mongoose.model('swim', SwimSchema)
const Run = mongoose.model('run', RunSchema)
const Jump = mongoose.model('jump', JumpSchema)
const Interval = mongoose.model('interval', IntervalSchema)

module.exports = {
  User,
  Jump,
  Run,
  Swim,
  Interval,
  DEFAULT_CADENCES,
}
