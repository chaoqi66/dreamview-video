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

module.exports = {
  copyProperty,
  hideArrayObjects,
  convertToUpperCaseWithUnderscore,
  roundNumber,
}
