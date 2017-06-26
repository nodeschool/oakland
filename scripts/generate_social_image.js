const fs = require('fs');
const path = require('path');

const Nightmare = require('nightmare');
const sharp = require('sharp');

const nightmare = Nightmare({
  show: true
});

const WIDTH = 1200;
const HEIGHT = 630;
const SCREENSHOT_PATH = path.normalize(`${__dirname}/../docs/images/social.png`);

nightmare
  .viewport(WIDTH, HEIGHT)
  .goto(`file://${__dirname}/../docs/social.html`)
  .wait(500)
  .screenshot(SCREENSHOT_PATH, {
    x: 0, y: 0,
    width: WIDTH, height: HEIGHT
  })
  .end()
  .then(function () {
    console.log(`File written to ${SCREENSHOT_PATH}`);
    sharp(SCREENSHOT_PATH)
      .resize(WIDTH, HEIGHT)
      .toBuffer(function (error, data, { format }) {
        if (error) {
          console.log('Error compressing image', error);
        } else {
          fs.writeFile(SCREENSHOT_PATH, data, { encoding: 'binary' }, function (resizeError) {
            if (resizeError) {
              console.log('Error saving compressed iamge', resizeError);
            } else {
              console.log('Successfully resized image');
            }
          });
        }
      });
  })
  .catch(function (error) {
    console.log('Error generating social image:', error);
  });
