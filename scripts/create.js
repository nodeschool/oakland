const fs = require('fs');

const request = require('request');
const inquirer = require('inquirer');
const slug = require('slug');
const Mustache = require('mustache');
const moment = require('moment');
const _ = require('lodash');

const {
  NODESCHOOL_OAK_GITHUB_API_USER,
  NODESCHOOL_OAK_GITHUB_API_TOKEN,
  NODESCHOOL_OAK_TITO_API_KEY
} = process.env;
const TITO_URL = 'https://api.tito.io/v2/nodeschool-oakland';
const TITO_HEADERS = {
  Authorization: `Token token=${NODESCHOOL_OAK_TITO_API_KEY}`,
  Accept: 'application/vnd.api+json'
};
const GITHUB_URL = 'https://api.github.com';
const GITHUB_HEADERS = {
  Authorization: `token ${NODESCHOOL_OAK_GITHUB_API_TOKEN}`,
  'User-Agent': NODESCHOOL_OAK_GITHUB_API_USER
};
const GITHUB_ORG = 'Fauntleroy';
const GITHUB_REPO = 'github-api-test-repo';

const mentorIssueTemplate = fs.readFileSync(`${__dirname}/templates/mentor-registration-issue.mustache`, 'utf8');
const titoDescriptionTemplate = fs.readFileSync(`${__dirname}/templates/tito-description.mustache`, 'utf8');

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

const eventLocationNameQuestion = {
  type: 'input',
  name: 'eventLocationName',
  message: 'What is the name of the location of the event?',
  default: 'npm',
  validate: function (input) {
    if (!input) {
      return 'You must input a location name for the event!';
    }
    return true;
  }
};

const eventLocationQuestion = {
  type: 'input',
  name: 'eventLocation',
  message: 'Where will the event be located?',
  default: '1999 Harrison St. Ste. 1150 Oakland, CA 94612',
  validate: function (input) {
    if (!input) {
      return 'You must input a location for the event!';
    }
    return true;
  }
};

const eventDateQuestion = {
  type: 'input',
  name: 'eventDate',
  message: 'What date will the event be on? (MM/DD/YY)',
  validate: function (input) {
    if (!input) {
      return 'You must input a date for the event!';
    }
    return true;
  }
};

const eventTimeQuestion = {
  type: 'input',
  name: 'eventTime',
  message: 'What time will the event start?',
  default: '1-5PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for the event!';
    }
    return true;
  }
};

function createMentorIssue (data, callback) {
  const { eventName, eventLocationName, eventDate, eventTime } = data;
  const mentorIssueBody = Mustache.render(mentorIssueTemplate, {
    locationName: eventLocationName,
    date: moment(eventDate).format('MMMM Do'),
    time: eventTime
  });

  request.post({
    url: `${GITHUB_URL}/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues`,
    headers: GITHUB_HEADERS,
    json: true,
    body: {
      title: `Mentor Registration: ${eventName} at ${eventLocationName}`,
      body: mentorIssueBody
    }
  }, function (error, response, body) {
    const { html_url: mentorRegistrationUrl } = body;
    if (error) throw error;
    callback({ mentorRegistrationUrl });
  });
};

function createTitoEvent (data, callback) {
  const { eventName, eventLocationName, eventDate, eventTime, mentorRegistrationUrl } = data;
  const titoDescription = Mustache.render(titoDescriptionTemplate, {
    time: eventTime,
    mentorRegistrationUrl
  });
  request.post({
    url: `${TITO_URL}/events`,
    headers: TITO_HEADERS,
    json: true,
    body: {
      data: {
        type: 'events',
        attributes: {
          title: `${eventName} @ ${eventLocationName}`,
          slug: slug(eventName),
          description: titoDescription,
          'end-date': new Date(eventDate),
          'start-date': new Date(eventDate),
          live: false
        }
      }
    }
  }, function (error, response, body) {
    if (error) throw error;
    callback();
  });
};

inquirer.prompt([
  eventNameQuestion,
  eventLocationNameQuestion,
  eventLocationQuestion,
  eventDateQuestion,
  eventTimeQuestion
])
  .then(function (answers) {
    createMentorIssue(answers, function ({ mentorRegistrationUrl }) {
      console.log('Mentor Registration GitHub Issue created.');
      answers = _.assign(answers, {
        mentorRegistrationUrl
      });
      createTitoEvent(answers, function () {
        console.log('ti.to Event created.');
      });
    })
  });
