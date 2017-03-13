const request = require('request');

const {
  NODESCHOOL_OAK_TITO_API_KEY
} = process.env;

const TITO_ACCOUNT = 'nodeschool-oakland';
const TITO_URL = `https://api.tito.io/v2/${TITO_ACCOUNT}`;
const TITO_HEADERS = {
  Authorization: `Token token=${NODESCHOOL_OAK_TITO_API_KEY}`,
  Accept: 'application/vnd.api+json'
};
const TITO_EVENT_TO_DUPLICATE = 'october-2016-npm';

request.get({
  url: `${TITO_URL}/${TITO_EVENT_TO_DUPLICATE}/event_settings`,
  headers: TITO_HEADERS,
  json: true
}, function (error, response, body) {
  if (error) {
    console.error(error);
  }

  console.log(body);
});
