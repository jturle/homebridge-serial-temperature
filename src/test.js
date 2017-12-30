import SerialTemperature, {classTest} from './index';

let x = new classTest((val) => {
  console.log(val)
}, {
  port: '/dev/tty.usbmodem1441'
});

setInterval(() => {
  x.getState((err,val) => {
    // console.log('Result', val);
  });
}, 500);
