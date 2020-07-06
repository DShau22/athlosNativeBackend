const fs = require('fs')
const util = require('util');
const fsRead = util.promisify(fs.read);
const fsOpen = util.promisify(fs.open);

// all the characters that the first marker byte could be
const markerSet = new Set(['0','1','3','4','5','A','B','C','D','F','J','K','L','O','S','T','U','R','W','Y','Z'])
const semicolon_ascii = ";".charCodeAt(0)

// IF THIS IS FALSE, SEND A FAILED REQUEST SOMEHOW
function validate(byte, idx) {
  let string_representation = String.fromCharCode(byte)
  if (!markerSet.has(string_representation)) {
    console.log(string_representation)
    console.log("*********** NOT A VALID FILE ************")
  }
  return markerSet.has(string_representation)
} 

function merge_two_bytes(first8, second8) {
  return (first8 << 8) + second8
}

function merge_three_bytes(first8, second8, third8) {
  return (first8 << 16) + (second8 << 8) + third8
}

// jump[0]: '3' (report height), '4' (report hangtime), '5' (bball)
// jump[1]: hangtime in .02s
// jump[2]: ndata .02s, jump[3]: bs, jump[4]: # jumps, jump[5]: 10*(# baskets made)
// swim[0]: stroke, swim[1]: lap count, swim[2]: ndata in .1s, swim[3]: 55 or junk, 55 mean ended swim
// swim[4]: laptime, swim[5]: cals
// run[0]: "R" for run, 'W' for walk, and more for other modes
// run[1]: time since start if you wanna report using pace
// run[2]: ndata .1s
// run[3]: step count
// run[4]: time in minutes, run[5]: cals
// unscrambles encoded byte file
function convert(byteArr) {
  var converted = []
  var idx = 0;
  var mode;
  var lapCount; 
  var ndata;
  var stepCount;
  var lapTime;
  var calorie;
  while (idx < (byteArr.length - 15)) {
    if ((byteArr[idx+15] === semicolon_ascii) && validate(byteArr[idx], idx)) {
      mode = byteArr[idx];
      lapCount = merge_two_bytes(byteArr[idx + 1],byteArr[idx + 2]);
      ndata = merge_three_bytes(byteArr[idx + 5], byteArr[idx + 4], byteArr[idx + 6]);
      stepCount = merge_three_bytes(byteArr[idx + 10], byteArr[idx + 8], byteArr[idx + 9])
      lapTime = merge_three_bytes(byteArr[idx + 11], byteArr[idx + 7], byteArr[idx + 3])
      calorie = merge_three_bytes(byteArr[idx + 12], byteArr[idx + 13], byteArr[idx + 14])
      converted.push([mode, lapCount, ndata, stepCount, lapTime, calorie])
      idx += 16;
    } else {
      idx++;
    }
  }
  return converted
}

module.exports = {

  readEncoded: async function readEncoded(filePath) {
    var byteArr = [];
    var converted = [];
    var fd;
    // open the file
    try {
      fd = await fsOpen(filePath, 'r')
    } catch(e) {
      console.log("error opening file")
      throw e
    }

    // read the file into byte array and unscramble it
    try {
      var buffer = new Buffer.alloc(1, "hex")
      var numBytesRead = await fsRead(fd, buffer, 0, 1, null);
      numBytesRead = numBytesRead.bytesRead
      while (numBytesRead !== 0) {
        byteArr.push(buffer[0])
        let res = await fsRead(fd, buffer, 0, 1, null);
        numBytesRead = res.bytesRead
      }
      converted = convert(byteArr)
    } catch(e) {
      console.log('error reading file')
      throw e
    }

    return converted
  }
}
