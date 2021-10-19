const { DateTime } = require('luxon');

/**
 * returns a date object representing last Monday from the day that is passed in
 * @param {DateTime} day 
 */
function getLastMonday(date) { // if day isn't passed in, assume its the actual today
  if (!date) {
    var lastMonday = DateTime.local();
  } else {
    var lastMonday = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
    }, {zone: date.zone});
  }
   // weekday is 1-7 where 1 is monday, 7 is sunday
  return lastMonday.minus({day: lastMonday.weekday - 1}).set({
    hour: 0, minute: 0,  second: 0, millisecond: 0
  }, {zone: date.zone});
}

/**
 * returns a date object representing next Sunday from the day that is passed in
 * @param {DateTime} day 
 */
function getNextSunday(date) {
  if (!date) {
    var nextSunday = DateTime.local();
  } else {
    var nextSunday = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
    }, {zone: date.zone});
  }
  // weekday is 1-7 where 1 is monday, 7 is sunday
  return nextSunday.plus({day: 7 - nextSunday.weekday}).set({
    hour: 0, minute: 0, second: 0, millisecond: 0
  }, {zone: date.zone});
}

/**
 * returns a date object representing next Sunday from the day that is passed in
 * @param {DateTime} day 
 */
 function getNextMonday(date) {
  if (!date) {
    var nextMonday = DateTime.local();
  } else {
    var nextMonday = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
    }, {zone: date.zone});
  }
  // weekday is 1-7 where 1 is monday, 7 is sunday
  return nextMonday.plus({day: 8 - nextMonday.weekday}).set({
    hour: 0, minute: 0, second: 0, millisecond: 0
  }, {zone: date.zone});
}

/**
 * returns a date object representing next Sunday from the day that is passed in
 * @param {DateTime} day 
 */
 function getNextSaturday(date) {
  if (!date) {
    var nextSaturday = DateTime.local();
  } else {
    var nextSaturday = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
    }, {zone: date.zone});
  }
  // weekday is 1-7 where 1 is monday, 7 is sunday
  return nextSaturday.plus({day: 6 - (nextSaturday.weekday % 7)}).set({
    hour: 0, minute: 0, second: 0, millisecond: 0
  }, {zone: date.zone});
}

/**
 * returns a date object representing next Sunday from the day that is passed in
 * @param {DateTime} day 
 */
function getLastSunday(date) {
  if (!date) {
    var lastSunday = DateTime.local();
  } else {
    var lastSunday = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
    }, {zone: date.zone});
  }
   // weekday is 1-7 where 1 is monday, 7 is sunday
  return lastSunday.minus({day: (lastSunday.weekday % 7)}).set({
    hour: 0, minute: 0,  second: 0, millisecond: 0
  }, {zone: date.zone});
}

/**
 * Checks that two date time objects have the same day calendar date
 * @param {DateTime} day1 
 * @param {DateTime} day2 
 */
function sameDate(date1, date2) {
  return date1.day === date2.day &&
        date1.month === date2.month &&
        date1.year === date2.year;
}

module.exports = {
  getLastMonday,
  getNextSunday,
  getNextMonday,
  getLastSunday,
  getNextSaturday,
  sameDate
}