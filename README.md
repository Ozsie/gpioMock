# GPIO Mock
[![NPM](https://nodei.co/npm/gpio-mock.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gpio-mock/)

[![Build Status](https://travis-ci.org/Ozsie/gpioMock.svg?branch=master)](https://travis-ci.org/Ozsie/gpioMock)
[![Coverage Status](https://coveralls.io/repos/github/Ozsie/gpioMock/badge.svg?branch=master)](https://coveralls.io/github/Ozsie/gpioMock?branch=master)

A framework to mock GPIO by redirecting calls to /sys/class/gpio/* to ./sys/class/gpio/*

This framework does not provide any simulated hardware, with the exception of DS18B20 digital thermomters which can be
simulated in a number of ways.

GPIO Mock redirects any fs function call concerning paths starting with '/sys/class/gpio' to (by default)
'./sys/class/gpio'. This means that tests that either do not require hardware, or tests that can function with
simulated hardware can function without changes to the code.

## Documentation
https://ozsie.github.io/gpioMock/gpio-mock/1.0.1

## Some examples

### Using 'fs' directly

####Test
```
let gpioMock = require('gpio-mock');
let fs = require('fs');

gpioMock.start(function(err) {
  fs.writeFile('/sys/class/gpio/export', '1', function(err) {
    if (!err) {
      // GPIO 1 is exported.
      fs.writeFile('/sys/class/gpio/gpio1/direction', 'out', function(err) {
        if (!err) {
          // GPIO 1 is set to out
          fs.writeFile('/sys/class/gpio/gpio1/value', 1, function(err) {
            // GPIO 1 is set to high
          }
        }
      });
    }
  });
  
  // Reset changes to fs when done
  gpioMock.stop();
});
```

#### Simulated hardware

```
let fs = require('fs');

// Simulated LED
function ledSwitch() {
  setTimeout(function() {
    fs.readFile('./sys/gpio/gpio1/value', 'utf8', function(err, fd) {
      if (!err && fd === '1') {
        console.log('LED is on!');
      }
    });
    ledSwitch();
  }, 200)
}
```

The simulated LED above could just as well be an IR LED, with a simulated IR receiver writing '1' to
./sys/class/gpio/gpio2/value when GPIO1 is '1', and writing '2' when GPIO1 is '0';


### Using mc-gpio

####Test
```
let gpioMock = require('gpio-mock');
let gpio = require('mc-gpio');

gpioMock.start(function(err) {
  gpio.openPinOut(1, function(err, data) {
    if (!err) {
      // GPIO1 is open and set to out
      gpio.write(1, '1', function(err, data) {
        if (!err) {
          // GPIO1 is set to high
        }
      }
    }
  });
  
  // Reset changes to fs when done
  gpioMock.stop();
});
```

#### Simulated hardware

```
let fs = require('fs');

// Simulated LED
function ledSwitch() {
  setTimeout(function() {
    fs.readFile('./sys/gpio/gpio1/value', 'utf8', function(err, fd) {
      if (!err && fd === '1') {
        console.log('LED is on!');
      }
    });
    ledSwitch();
  }, 200)
}
```