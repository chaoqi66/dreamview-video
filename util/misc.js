const moment = require('moment-timezone')

const copyProperty = function (toObj, fromObj) {
  for (const property in fromObj) {
    if (fromObj.hasOwnProperty(property)) {
      toObj[property] = fromObj[property];
    }
  }
}

const hideArrayObjects = function (objects, startIdx = 0) {
  if (objects.constructor === Array && objects.length > 0) {
    let idx = startIdx;
    for (;idx < objects.length; idx += 1) {
      objects[idx].visible = false;
    }
  }
}

const convertToUpperCaseWithUnderscore = function (str) {
  if (str === str.toUpperCase()) {
    return str;
  }
  return str.replace(/[A-Z]/g, '_$&').toUpperCase();
}

const roundNumber = function (value, decimalPlaces) {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) {
    return value;
  }

  const roundedValue = numericValue.toFixed(decimalPlaces);
  const roundedNumericValue = parseFloat(roundedValue);

  if (Number.isInteger(roundedNumericValue) && decimalPlaces > 0) {
    return numericValue.toFixed(0);
  }

  return roundedValue;
}

function toDate(stamp) {
  const { sec, nsec } = stamp;
  return new Date(sec * 1000 + nsec / 1e6);
}

const formatTime = function(stamp, timezone, timeFormat) {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error('Times are not allowed to be negative');
    return '(invalid negative time)';
  }
  return moment.tz(toDate(stamp), timezone || moment.tz.guess()).format(timeFormat || 'YYYY-MM-DD hh:mm:ss.SSS A z');
}

const  fromSecStr = function (value) {
  const arr = value.split('.');
  const sec = parseInt(arr[0]);
  const nsecStr = '' + (arr[1] || 0);
  const nsec = nsecStr.length > 9 ? parseInt(nsecStr.substring(0, 9)) : parseInt(parseInt(nsecStr.padEnd(9, '0')));
  return { sec, nsec };
}

module.exports = {
  formatTime,
  fromSecStr,
  copyProperty,
  hideArrayObjects,
  convertToUpperCaseWithUnderscore,
  roundNumber,
}
