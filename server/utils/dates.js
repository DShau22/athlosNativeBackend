function parseDate(uploadDate) {
  // parses the UTC date object
  var timestampToDate = new Date(uploadDate)
  var dateString = timestampToDate.toString()
  // [Day, Month, month date, year, time, Standard, Standard (written out)]
  var parsed = dateString.split(" ")
  return parsed
}

// returns a date object representing last Monday from the day that is passed in
function getLastMonday(day) { // if day isn't passed in, assume its the actual today
  var lastMonday = new Date(day);
  if (!day) {
    lastMonday = new Date();
  }
  if (lastMonday.getDay() === 0) { // if it's sunday, just subtract 6
    lastMonday.setDate(lastMonday.getDate() - 6);
  } else {
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() + 1); // should be the monday of this week
    lastMonday.setHours(0,0,0,0);
  }
  return lastMonday;
}

// returns a date object representing next Sunday from the day that is passed in
function getNextSunday(day) {
  var lastMonday = new Date(day);
  if (!day) {
    lastMonday = new Date();
  }
  if (lastMonday.getDay() === 0) {
    return lastMonday;
  }
  lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() + 1); // should be the monday of this week
  lastMonday.setHours(0,0,0,0);

  let nextSunday = new Date();
  nextSunday.setDate(lastMonday.getDate() + 6);
  nextSunday.setHours(0,0,0,0);
  return nextSunday;
}

function sameDate(day1, day2) {
  return day1.getDay() === day2.getDay() && 
        day1.getDate() === day2.getDate() && 
        day1.getMonth() === day2.getMonth() && 
        day1.getFullYear() === day2.getFullYear()
}

module.exports = {
  parseDate,
  getLastMonday,
  getNextSunday,
  sameDate
}