const eventTable = [
  // 50 yd free
];

// all the characters that the first marker byte could be
const markerSet = new Set([
  '3'.charCodeAt(0),
  '4'.charCodeAt(0),
  '5'.charCodeAt(0),
  'F'.charCodeAt(0),
  'U'.charCodeAt(0),
  'O'.charCodeAt(0),
  'Y'.charCodeAt(0),
  'W'.charCodeAt(0),
  'R'.charCodeAt(0),
  'J'.charCodeAt(0),
  'M'.charCodeAt(0), // switched modes
]);
const M_ascii = 'M'.charCodeAt(0);
const basketball_mode = '5'.charCodeAt(0);
const semicolon_ascii = ";".charCodeAt(0);

const FLY = 'U';
const BACK = 'Y';
const BREAST = 'O';
const FREE = 'F';
const HEAD_UP = 'J';

//fly back breast free or any of the races
const swimSet = new Set([
  FLY.charCodeAt(0),
  BACK.charCodeAt(0),
  BREAST.charCodeAt(0),
  FREE.charCodeAt(0),
  HEAD_UP.charCodeAt(0),
]);
// Array(35).forEach((_, idx) => {
//   swimSet.add(idx);
//   markerSet.add(idx);
// });
const jumpSet = new Set(['3'.charCodeAt(0), '4'.charCodeAt(0), '5'.charCodeAt(0)]);
const stepSet = new Set(['R'.charCodeAt(0), 'W'.charCodeAt(0)]);

// IF THIS IS FALSE, SEND A FAILED REQUEST SOMEHOW
function validate(byte, idx) {
  if (!markerSet.has(byte)) {
    console.log("*********** NOT A VALID FILE ************");
    console.log(`${String.fromCharCode(byte)} is not part of the cEvent marker set`);
  }
  return markerSet.has(byte);
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
    // console.log(`idx: ${idx}, byte: ${byteArr[idx]}`);
    if ((byteArr[idx+15] === semicolon_ascii) && validate(byteArr[idx], idx)) {
      // console.log(`valid!: ${byteArr[idx]}`);
      cEvent = byteArr[idx];
      if (cEvent === M_ascii) {
        converted.push([cEvent, 0, 0, 0, 0, 0]);
      } else {
        lapCount = merge_two_bytes(byteArr[idx + 1],byteArr[idx + 2]);
        ndata = merge_three_bytes(byteArr[idx + 5], byteArr[idx + 4], byteArr[idx + 6]);
        stepCount = merge_three_bytes(byteArr[idx + 10], byteArr[idx + 8], byteArr[idx + 9]);
        lapTime = merge_three_bytes(byteArr[idx + 11], byteArr[idx + 7], byteArr[idx + 3]);
        calorie = merge_three_bytes(byteArr[idx + 12], byteArr[idx + 13], byteArr[idx + 14]);
        converted.push([cEvent, lapCount, ndata, stepCount, lapTime, calorie]);
        // console.log("ndata: ", ndata);
      }
      idx += 16;
    } else {
      idx++;
    }
  }
  return converted
}

const calcHeight = (hangtime) => {
  // to nearest hundreths digit
  const heightInHundreths = hangtime * hangtime * 2;
  const heightInInches = heightInHundreths / 100;
  return heightInInches;
}

/**
 * 
 * @param {Array[Array]} unscrambled: unscrambled list of lists. Output of unscrambleSessionBytes function
 * @param {String} userID: user's id in the mongo users collection
 * @param {Date} sessionDate: the date that this session byte array was stored on the user's phone
 */
const createSessionJsons = (unscrambled, userID, sessionDate) => {
  console.log("unscrambled: ", unscrambled);
  const sessionJsons = {
    run: { // contains the combined run an walk data
      userID,
      uploadDate: sessionDate,
      num: 0,
      cadences: [],
      calories: 0,
      time: 0,
      walkCadences: [], // cadences for when the user has hiking mode enabled to support JJ
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
      shotsMade: 0,
      time: 0
    },
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
        const cadence = Math.round((numSteps - prevNumSteps) / (time - prevTime));
        sessionJsons.run.cadences.push(cadence);
        if (cEvent === "W".charCodeAt(0)) {
          sessionJsons.run.walkCadences.push(cadence);
        }
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport ? statReport[0] : null;
      }
      const lastStepStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.run.num += lastStepStatReport[3];
      sessionJsons.run.calories += lastStepStatReport[5] / 10;
      sessionJsons.run.time += lastStepStatReport[2] / 600;
    } else if (swimSet.has(cEvent)) {
      // console.log("swim: ", statReport);
      while (swimSet.has(cEvent) && statReportIdx < unscrambled.length) {
        sessionJsons.swim.lapTimes.push({
          lapTime: statReport[4] / 10, // laptime in seconds
          finished: statReport[3] !== 0 // 0 means they turned. Anything else means finished
        });
        sessionJsons.swim.strokes.push(String.fromCharCode(cEvent));
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport ? statReport[0] : null;
      }
      const lastSwimStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.swim.num = sessionJsons.swim.strokes.length;
      sessionJsons.swim.calories += lastSwimStatReport[5] / 10;
      // console.log("last swim stat report: ", lastSwimStatReport);
      sessionJsons.swim.time += lastSwimStatReport[2] / 600;
    } else if (jumpSet.has(cEvent)) {
      while (jumpSet.has(cEvent) && statReportIdx < unscrambled.length) {
        const heightInInches = calcHeight(statReport[4]);
        if (heightInInches < 64) {
          sessionJsons.jump.num++;
          sessionJsons.jump.heights.push(heightInInches); // contains hangtime
        }
        // move onto the next stat report record
        statReportIdx += 1;
        statReport = unscrambled[statReportIdx];
        cEvent = statReport ? statReport[0] : null;
      }
      const lastJumpStatReport = unscrambled[statReportIdx - 1];
      sessionJsons.jump.shotsMade += cEvent === basketball_mode ? lastJumpStatReport[5] : 0;
      sessionJsons.jump.time += lastJumpStatReport[2] / 3000;
    } else {
      console.log(`not a valid cEvent in the unscrambled array: ${cEvent}`);
      statReportIdx += 1;
    }
  }
  return sessionJsons;
}

const calcReferenceTimes = (oldRefTimes, swimJson) => {
  const { lapTimes, strokes } = swimJson;
  var flyAvg = oldRefTimes.fly[0] / 1.1;
  var backAvg = oldRefTimes.back[0] / 1.1;
  var breastAvg = oldRefTimes.breast[0] / 1.1;
  var freeAvg = oldRefTimes.free[0] / 1.1;
  for (let i = 0; i < lapTimes.length; i++) {
    switch(strokes[i]) {
      case FLY:
        flyAvg = (7*flyAvg)/8 + lapTimes[i].lapTime/8;
        break;
      case BACK:
        backAvg = (7*backAvg)/8 + lapTimes[i].lapTime/8;
        break;
      case BREAST:
        breastAvg = (7*breastAvg)/8 + lapTimes[i].lapTime/8;
        break;
      case FREE:
        freeAvg = (7*freeAvg)/8 + lapTimes[i].lapTime/8;
        break;
      default:
        console.log(`${strokes[i]} is not valid`);
        break;
    }
  }
  return {
    fly: [flyAvg * 1.1, flyAvg * .9],
    back: [backAvg * 1.1, backAvg * .9],
    breast: [breastAvg * 1.1, breastAvg * .9],
    free: [freeAvg * 1.1, freeAvg * .9],
  };
}

module.exports = {
  unscrambleSessionBytes,
  createSessionJsons,
  calcReferenceTimes
}
