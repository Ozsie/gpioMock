/* jshint node: true */
'use strict';

let fs = require('fs');
let mkdirp = require('mkdirp');

let sysDS18B20Path = '/sys/bus/w1/devices/';
var mockDS18B20Path = './sys/bus/w1/devices';

let ds18b20FileContents = '00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t=';

var ds18b20 = {};

let sensorFunction = function() {
  for (var id in ds18b20) {
    var sensor = ds18b20[id];
    if (sensor.stop || sensor.behavior !== 'function') {
      return;
    }
     handleFunctionSensor(id, sensor);
  }
};

let handleFunctionSensor = function(id, sensor) {
  var value = sensor.temperature();
  fs.writeFileSync(mockDS18B20Path + '/' + id + '/w1_slave', ds18b20FileContents + value);
};

let sensorStatic = function() {
  for (var id in ds18b20) {
    var sensor = ds18b20[id];
    if (sensor.stop || sensor.behavior !== 'static') {
      return;
    }
    handleStaticSensor(id, sensor);
  }
};

let handleStaticSensor = function(id, sensor) {
  fs.writeFileSync(mockDS18B20Path + '/' + id + '/w1_slave', ds18b20FileContents + parseInt(sensor.temperature * 1000));
};

let updateSensors = function(callback) {

  let addW1Slave = function(key, callback) {
    let sensor = ds18b20[key];
    sensor.stop = false;
    mkdirp(mockDS18B20Path + '/' + key, function(err) {
      if (!err) {
        sensor.added = true;
        if (sensor.behavior === 'external') {
          handleStaticSensor(key, sensor);
        } else if (sensor.behavior === 'function') {
          handleFunctionSensor(key, sensor);
        } else if (sensor.behavior === 'static') {
          handleStaticSensor(key, sensor);
        }
        callback();
      } else {
        callback(err);
      }
    });
  };

  for (var key in ds18b20) {
    if (!ds18b20[key].added) {
      addW1Slave(key, callback);
    }
  }
};

let stop = function() {
  for (var id in ds18b20) {
    var sensor = ds18b20[id];
    sensor.stop = true;
  }
  ds18b20 = {};
};

let addDS18B20 = function(id, sensor, callback) {
  if (ds18b20[id]) {
    callback(new Error("sensor already registered"));
  } else {
    setDS18B20(id, sensor, callback);
  }
};

let setDS18B20 = function(id, sensor, callback) {
  ds18b20[id] = sensor;
  updateSensors(callback);
};

module.exports = {
  sensorFunction: sensorFunction,
  handleFunctionSensor: handleFunctionSensor,
  sensorStatic: sensorStatic,
  handleStaticSensor: handleStaticSensor,
  updateSensors: updateSensors,
  stop: stop,
  addDS18B20: addDS18B20,
  setDS18B20: setDS18B20,
  sysPath: sysDS18B20Path,
  mockPath: mockDS18B20Path
};