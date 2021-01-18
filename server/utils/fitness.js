// all the characters that the first marker byte could be
const markerSet = new Set(['0','1','3','4','5','A','B','C','D','F','J','K','L','O','S','T','U','R','W','Y','Z'])
const semicolon_ascii = ";".charCodeAt(0)

const date = new Date()

const jumpHeight = '3'
const jumpHangtime = '4'
const jumpBball = '5'
const run = 'R'
const walk = 'W'

const swimSet = new Set(['U', 'Y', 'O', 'F']) //fly back breast free
const jumpSet = new Set(['3', '4', '5'])
const stepSet = new Set(['R', 'W'])
// first entry of each set tells the activity
const activityNumber = 0

// IF THIS IS FALSE, SEND A FAILED REQUEST SOMEHOW
function validate(byte, idx) {
  let string_representation = String.fromCharCode(byte)
  if (!markerSet.has(string_representation)) {
    console.log("*********** NOT A VALID FILE ************")
    console.log(`${string_representation} is not part of the cEvent marker set`);
  }
  return markerSet.has(string_representation)
} 

function merge_two_bytes(first8, second8) {
  return (first8 << 8) + second8;
}

function merge_three_bytes(first8, second8, third8) {
  return (first8 << 16) + (second8 << 8) + third8;
}

/**
 * jump[0]: '3' (report height), '4' (report hangtime), '5' (bball)
 * jump[1]: hangtime in .02s
 * jump[2]: ndata .02s, jump[3]: bs, jump[4]: # jumps, jump[5]: 10*(# baskets made)
 * swim[0]: stroke, swim[1]: lap count, swim[2]: ndata in .1s, swim[3]: 55 or junk, 55 mean ended swim
 * swim[4]: laptime, swim[5]: cals
 * run[0]: "R" for run, 'W' for walk, and more for other modes
 * run[1]: time since start if you wanna report using pace
 * run[2]: ndata .1s
 * run[3]: step count
 * run[4]: time in minutes, run[5]: cals
 * unscrambles encoded byte file
 * @param {Buffer} byteArr 
 * returns a list of lists where the sublists contain 6 elements representing a stat report.
 */
const unscrambleSessionBytes = (byteArr) => {
  var converted = [];
  var idx = 0;
  var cEvent;
  var lapCount; 
  var ndata;
  var stepCount;
  var lapTime;
  var calorie;
  while (idx < (byteArr.length - 15)) {
    if ((byteArr[idx+15] === semicolon_ascii) && validate(byteArr[idx], idx)) {
      cEvent = byteArr[idx];
      lapCount = merge_two_bytes(byteArr[idx + 1],byteArr[idx + 2]);
      ndata = merge_three_bytes(byteArr[idx + 5], byteArr[idx + 4], byteArr[idx + 6]);
      stepCount = merge_three_bytes(byteArr[idx + 10], byteArr[idx + 8], byteArr[idx + 9]);
      lapTime = merge_three_bytes(byteArr[idx + 11], byteArr[idx + 7], byteArr[idx + 3]);
      calorie = merge_three_bytes(byteArr[idx + 12], byteArr[idx + 13], byteArr[idx + 14]);
      converted.push([cEvent, lapCount, ndata, stepCount, lapTime, calorie]);
      idx += 16;
    } else {
      idx++;
    }
  }
  return converted
}

const calcHeight = (hangtime) => {
  // truncate to nearest tenths digit
  const heightInTenths = Math.floor((hangtime * hangtime)/2);
  const heightInInches = heightInTenths / 10;
  return heightInInches;
}

/**
 * 
 * @param {Array[Array]} unscrambled: unscrambled list of lists. Output of unscrambleSessionBytes function
 * @param {String} userID: user's id in the mongo users collection
 * @param {Date} sessionDate: the date that this session byte array was stored on the user's phone
 */
const createSessionJsons = (unscrambled, userID, sessionDate) => {
  const sessionJsons = {
    run: {
      userID,
      uploadDate: sessionDate,
      num: 0,
      cadences: [],
      calories: 0,
      time: 0
    },
    swim: {
      userID,
      uploadDate: sessionDate,
      num: 0,
      lapTimes: [],
      strokes: [],
      calories: 0,
      time: 0
    },
    jump: {
      userID,
      uploadDate: sessionDate,
      num: 0,
      heights: [],
      calories: 0,
      time: 0
    }
  }
  var statReportIdx = 0;
  var cEvent = null;
  var statReport = null;
  while (statReportIdx < unscrambled.length) {
    statReport = unscrambled[statReportIdx];
    cEvent = statReport[0];
    if (stepSet.has(cEvent)) {
      var prevNumSteps = 0;
      var numSteps = 0;
      var time = 0;
      var prevTime = 0;
      while (stepSet.has(cEvent) && statReportIdx < unscrambled.length) {
        // update cadence array
        prevTime = time;
        time = statReport[2] / 600;
        prevNumSteps = numSteps;
        numSteps = statReport[3];
        sessionJsons.run.cadences.push(Math.round((numSteps - prevNumSteps) / (time - prevTime)));
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport[0];
      }
      const lastRunStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.run.num += lastRunStatReport[3];
      sessionJsons.run.calories += lastRunStatReport[5];
      sessionJsons.run.time += lastRunStatReport[2] / 600;
    } else if (swimSet.has(cEvent)) {
      while (swimSet.has(cEvent) && statReportIdx < unscrambled.length) {
        sessionJsons.swim.lapTimes.push({
          lapTime: statReport[4],
          finished: statReport[3] === 55
        });
        sessionJsons.swim.strokes.push(String.fromCharCode(statReport[0]));
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport[0];
      }
      const lastSwimStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.swim.num += lastSwimStatReport[1];
      sessionJsons.swim.calories += lastSwimStatReport[5];
      sessionJsons.swim.time += lastSwimStatReport[2] / 600;
    } else if (jumpSet.has(cEvent)) {
      while (jumpSet.has(cEvent) && statReportIdx < unscrambled.length) {
        sessionJsons.jump.num++;
        sessionJsons.jump.heights.push(calcHeight(statReport[4])); // contains hangtime
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport[0];
      }
      const lastJumpStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.jump.calories += lastJumpStatReport[5];
      sessionJsons.jump.time += Math.round(lastJumpStatReport[2] / 3000);
    } else {
      console.log(`not a valid cEvent in the unscrambled array: ${cEvent}`);
      statReportIdx += 1;
    }
  }
  return sessionJsons;
}

// run[0]: "R" for run, 'W' for walk, and more for other modes
// run[1]: time in minutes
// run[2]: ndata .1s
// run[3]: step count
// run[4]: time since start if you wanna report using cadence, run[5]: cals
function updateRunJson(runJson, statReport) {
  var numSteps = 0;
  var calories = 0;
  var time     = 0;
  var prevNumSteps = 0;
  var prevTime     = 0;
  var cadences = [];

  converted.forEach(function(set) {

    let string_rep = String.fromCharCode(set[activityNumber])
    //console.log('running set: ', set)
    if (stepSet.has(string_rep)) {
      prevNumSteps = numSteps
      prevTime = time
      numSteps = set[3]
      calories = set[5]
      time     = set[2] / (600) // time in min
      cadence = (numSteps - prevNumSteps) / (time - prevTime) // steps per min
      cadences.push(cadence)
    }
  })
  var json = {
    userID,
    uploadDate: today,
    num: numSteps,
    cadences,
    calories,
    time,
  }
  // console.log(JSON.stringify(json))
  return json
}

// swim[0]: stroke, swim[1]: lap count, swim[2]: ndata in .1s, swim[3]: 55 or junk, 55 mean ended swim
// swim[4]: laptime, swim[5]: cals
function updateSwimJson(swimJson, statReport) {
  var calories = 0;
  var lapTimes = [];
  var strokes = [];
  var time = 0;
  converted.forEach(function(set) {
    // 1 corresponds to swimming
    let string_rep = String.fromCharCode(set[activityNumber])
    if (swimSet.has(string_rep)) {
      calories = set[5]
      time = set[2]
      lapTimes.push({
        lapTime: set[4],
        finished: swim[3] === 55
      })
      strokes.push(set[0])
    }
  })
  time = Math.round(time / 600) //1 sample per .1 seconds, returns time in minutes
  var json = {
    userID: userID,
    uploadDate: today,
    num: strokes.length,
    calories,
    lapTimes,
    time,
    strokes,
  }
  return json
}

// jump[0]: '3' (report height), '4' (report hangtime), '5' (bball)
// jump[1]: hangtime in .02s
// jump[2]: ndata .02s, jump[3]: bs, jump[4]: # jumps, jump[5]: 10*(# baskets made)
function updateJumpJson(jumpJson, statReport) {
  const calcHeight = (hangtime) => {
    // truncate to nearest tenths digit
    return Math.floor(hangtime * hangtime * 2 * 10) / 10
  }
  var numJumps = 0
  var time = 0
  var heights = []
  converted.forEach(function(set) {
    // '3' '4' or '5' corresponds to jumping
    let string_rep = String.fromCharCode(set[activityNumber])
    if (jumpSet.has(string_rep)) {
      numJumps++
      time = set[2]
      heights.push(calcHeight(set[1])) //set[1] contains hangtime
    }
  })
  
  time = Math.round(time / 3000) // sampling rate is 1 sample/.02 seconds, now in minutes
  var json = {
    userID: userID,
    uploadDate: today,
    heights: heights,
    num: numJumps,
    time,
    calories: -1, //default for now since the algo doesn't write calories
  }
  // console.log(JSON.stringify(json))
  return json
}

module.exports = {
  unscrambleSessionBytes,
  createSessionJsons,
}
