'use strict';

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var x = new _index.classTest(function (val) {
  console.log(val);
}, {
  port: '/dev/tty.usbmodem1441'
});

setInterval(function () {
  x.getState(function (err, val) {
    // console.log('Result', val);
  });
}, 500);