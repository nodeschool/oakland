const request = require('request');
const inquirer = require('inquirer');
const slug = require('slug');

const { TITO_API_KEY } = process.env;
const TITO_URL = 'https://api.tito.io/v2/nodeschool-oakland';
const TITO_HEADERS = {
  Authorization: `Token token=${TITO_API_KEY}`,
  Accept: 'application/vnd.api+json'
};

slug.defaults.mode = 'rfc3986';

const eventNameQuestion = {
  type: 'input',
  name: 'eventName',
  message: 'What is the name of the event?',
  validate: function (input) {
    if (input.length <= 0) {
      return 'You must input a name for the event!';
    }
    return true;
  }
};

const eventDateQuestion = {
  type: 'input',
  name: 'eventDate',
  message: 'What date will the event be on? (DD/MM/YY)',
  validate: function (input) {
    // do date validation here
  }
};

const eventStartTimeQuestion = {
  type: 'input',
  name: 'eventStartTime',
  message: 'What time will the event start?',
  validate: function (input) {
    // do date validation here
  }
};

const eventEndTimeQuestion = {
  type: 'input',
  name: 'eventEndTime',
  message: 'What time will the event end?',
  validate: function (input) {
    // do date validation here
  }
};

inquirer.prompt([eventNameQuestion])
  .then(function ({ eventName }) {
    request.post({
      url: `${TITO_URL}/events`,
      headers: TITO_HEADERS,
      json: true,
      body: {
        data: {
          type: 'events',
          attributes: {
            title: eventName,
            slug: slug(eventName),
            live: false
          }
        }
      }
    }, function (error, response, body) {
      console.log('error', error);
      console.log('body', body);
    });
  });
