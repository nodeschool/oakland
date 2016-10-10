const fs = require('fs');

const request = require('request');
const inquirer = require('inquirer');
const slug = require('slug');
const Mustache = require('mustache');
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
const ora = require('ora');
const chalk = require('chalk');

slug.defaults.mode = 'rfc3986';

const {
  NODESCHOOL_OAK_GITHUB_API_USER,
  NODESCHOOL_OAK_GITHUB_API_TOKEN,
  NODESCHOOL_OAK_TITO_API_KEY
} = process.env;
const TITO_ACCOUNT = 'nodeschool-oakland';
const TITO_URL = `https://api.tito.io/v2/${TITO_ACCOUNT}`;
const TITO_HEADERS = {
  Authorization: `Token token=${NODESCHOOL_OAK_TITO_API_KEY}`,
  Accept: 'application/vnd.api+json'
};
const TITO_EVENT_TO_DUPLICATE = 'october-2016-npm';
const GITHUB_URL = 'https://api.github.com';
const GITHUB_HEADERS = {
  Authorization: `token ${NODESCHOOL_OAK_GITHUB_API_TOKEN}`,
  'User-Agent': NODESCHOOL_OAK_GITHUB_API_USER
};
const GITHUB_ORG = 'Fauntleroy';
const GITHUB_REPO = 'github-api-test-repo';
const SUCCESS_SYMBOL = chalk.green('✔');
const FAILURE_SYMBOL = chalk.red('✘');

const mentorIssueTemplate = fs.readFileSync(`${__dirname}/templates/mentor-registration-issue.mustache`, 'utf8');
const titoDescriptionTemplate = fs.readFileSync(`${__dirname}/templates/tito-description.mustache`, 'utf8');

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
  message: 'What date will the event be on? (YYYY-MM-DD)',
  validate: function (input) {
    if (!input) {
      return 'You must input a date for the event!';
    }
    const eventDateMoment = moment(input);
    if (!eventDateMoment.isValid()) {
      return 'You must input a valid date for the event!';
    }
    return true;
  }
};

const eventTimeQuestion = {
  type: 'input',
  name: 'eventTime',
  message: 'What time will the event be?',
  default: '1-5PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for the event!';
    }
    return true;
  }
};

function inquire (callback) {
  inquirer.prompt([
    eventNameQuestion,
    eventLocationNameQuestion,
    eventLocationQuestion,
    eventDateQuestion,
    eventTimeQuestion
  ])
  .then(function (answers) {
    callback(null, answers);
  });
}

function createMentorIssue (data, callback) {
  const progressIndicator = ora('Creating Mentor Registration GitHub Issue').start();
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
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    const { html_url: mentorRegistrationUrl } = body;
    const updatedData = _.assign(data, {
      mentorRegistrationUrl
    });
    callback(null, updatedData);
  });
}

function duplicateTitoEvent (data, callback) {
  const progressIndicator = ora('Duplicating existing ti.to Event').start();
  request.post({
    url: `${TITO_URL}/${TITO_EVENT_TO_DUPLICATE}/duplicate`,
    headers: TITO_HEADERS,
    json: true
  }, function (error, response, body) {
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    const eventApiId = _.get(body, 'data.id');
    const eventApiUrl = _.get(body, 'data.links.self');
    const updatedData = _.assign(data, {
      eventApiId,
      eventApiUrl
    });
    callback(null, updatedData);
  });
}

function updateTitoEvent (data, callback) {
  const progressIndicator = ora('Updating ti.to Event').start();
  const {
    eventName,
    eventLocation,
    eventLocationName,
    eventDate,
    eventTime,
    eventApiId,
    eventApiUrl,
    mentorRegistrationUrl
  } = data;
  const titoDescription = Mustache.render(titoDescriptionTemplate, {
    time: eventTime,
    mentorRegistrationUrl
  });
  const eventDateAsDate = moment(eventDate).toDate();

  request.patch({
    url: eventApiUrl,
    headers: TITO_HEADERS,
    json: true,
    body: {
      data: {
        type: 'events',
        id: eventApiId,
        attributes: {
          title: `${eventName} @ ${eventLocationName}`,
          slug: slug(eventName),
          description: titoDescription,
          location: eventLocation,
          'end-date': eventDateAsDate,
          'start-date': eventDateAsDate,
          live: false
        }
      }
    }
  }, function (error, response, body) {
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    const eventApiId = _.get(body, 'data.id');
    const eventApiUrl = _.get(body, 'data.links.self');
    const updatedData = _.assign(data, {
      eventApiId,
      eventApiUrl
    });
    callback(null, updatedData);
  });
}

function updateTitoEventSettings (data, callback) {
  const progressIndicator = ora('Updating ti.to Event settings').start();
  const { eventDate, eventTime, eventLocationName, eventApiUrl } = data;
  const date = moment(eventDate).format('MMMM Do');

  request.patch({
    url: `${eventApiUrl}/event_settings`,
    headers: TITO_HEADERS,
    json: true,
    body: {
      data: {
        type: 'event_settings',
        attributes: {
          'custom-ticket-message': `See you on ${date} from ${eventTime} at ${eventLocationName}! Don't forget to bring a laptop, if you've got one!`
        }
      }
    }
  }, function (error, response, body) {
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

function getTitoEventReleases (data, callback) {
  const progressIndicator = ora('Getting ti.to Event releases').start();
  const { eventApiUrl } = data;

  request.get({
    url: `${eventApiUrl}/releases`,
    headers: TITO_HEADERS,
    json: true
  }, function (error, response, body) {
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    const eventReleaseApiId = _.get(body, 'data[0].id');
    const eventReleaseApiUrl = _.get(body, 'data[0].links.self');
    const updatedData = _.assign(data, {
      eventReleaseApiId,
      eventReleaseApiUrl
    });
    callback(null, data);
  });
}

function updateTitoEventRelease (data, callback) {
  const progressIndicator = ora('Updating ti.to Event release').start();
  const { eventTime, eventReleaseApiId, eventReleaseApiUrl } = data;

  request.patch({
    url: `${eventReleaseApiUrl}`,
    headers: TITO_HEADERS,
    json: true,
    body: {
      data: {
        type: 'releases',
        id: eventReleaseApiId,
        attributes: {
          description: `Join us from ${eventTime} for an exciting day of learning and community! Start your journey with JavaScript, refine your grasp of the basics, or pick up something completely new!`
        }
      }
    }
  }, function (error, response, body) {
    if (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
      return;
    }

    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

async.waterfall([
  inquire,
  createMentorIssue,
  duplicateTitoEvent,
  updateTitoEvent,
  updateTitoEventSettings,
  getTitoEventReleases,
  updateTitoEventRelease
], function (error, result) {
  if (error) {
    console.log('ERROR', '\n', error);
  }
});
