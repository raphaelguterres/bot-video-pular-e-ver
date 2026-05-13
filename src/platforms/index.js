const coursera = require("./coursera.adapter");
const generic = require("./generic.adapter");

function getPlatformAdapter(platformPreset = "generic") {
  if (platformPreset === "coursera") {
    return coursera;
  }

  return generic;
}

module.exports = {
  getPlatformAdapter,
};
