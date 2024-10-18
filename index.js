const express = require('express');
const { Client } = require('discord.js-selfbot-v13');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { JSDOM } = require('jsdom'); // HTML parsing library

// Setup Express server
const app = express();
const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Setup Discord bot client
const mySecret = process.env['sa'];

if (!mySecret) {
  console.error("Token not found! Make sure 'sa' environment variable is set.");
  process.exit(1); // Exit if the token is not found
}

const channelId = '630777266187534347';
const baseUrl = 'https://minestrator.com/panel/action.php?action=codecadeau';
const tokenUrl = 'https://minestrator.com/panel/code/cadeau';

const headers = {
  'Host': 'minestrator.com',
  'Connection': 'keep-alive',
  'Sec-CH-UA': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'Accept': '*/*',
  'Sec-CH-UA-Platform': '"Windows"',
  'X-Requested-With': 'XMLHttpRequest',
  'Sec-CH-UA-Mobile': '?0',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Origin': 'https://minestrator.com',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Referer': 'https://minestrator.com/panel/code/cadeau',
  'Accept-Language': 'tr-TR,tr;q=0.9',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Cookie': 'SOCS=CAISNQgQEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNTE0LjA2X3AwGgJmaSADGgYIgOu0sgY; minesr_id=233995; __stripe_mid=ba5bf74b-3a9c-415b-bc4b-1f1df9c0c7dcc78a2d; minesr_tk=HUrSRjHDDxyRtBbGQL5vTPhDVcyCDLkv; PHPSESSID=mihn71b3me7ofhaqp14h2l0to0; cf_checks=aqSOCS=CAISNQgQEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNTE0LjA2X3AwGgJmaSADGgYIgOu0sgY; minesr_id=233995; __stripe_mid=ba5bf74b-3a9c-415b-bc4b-1f1df9c0c7dcc78a2d; minesr_tk=HUrSRjHDDxyRtBbGQL5vTPhDVcyCDLkv; PHPSESSID=mihn71b3me7ofhaqp14h2l0to0; cf_checks=aqSmaq; __stripe_sid=efb5c05c-80cf-4f16-aa80-de348bff9d79dae18a0532; __stripe_sid=efb5c05c-80cf-4f16-aa80-de348bff9d79dae18a'
};

// Function to get the token from the token URL
const getToken = async () => {
  try {
    // Perform GET request with custom headers
    const response = await fetch(tokenUrl, { method: 'GET', headers });
    const html = await response.text();
   

    // Proceed with extracting the token
    const dom = new JSDOM(html);
    const tokenInput = dom.window.document.querySelector('input[name="token"]');
    if (tokenInput) {
      return tokenInput.value;
    } else {
      throw new Error('Token input field not found in the HTML.');
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
};

// Function to make a POST request with a specific code and token
const makeRequest = async (code, token) => {
  const data = `code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`;

  try {
    // Make the POST request
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: headers,
      body: data
    });
    const result = await response.text(); // or response.json() if the response is JSON
    console.log(`Response for code ${code}: ${result}`);
  } catch (error) {
    console.error(`Error making request for code ${code}:`, error);
  }
};

// Helper function to wait for a given number of milliseconds
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Handle messages and extract codes
const client = new Client();
client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error('Channel not found!');
      return;
    }

    // Create a message collector without time limit
    const filter = message => message.content.includes("L'avion du air-drop est arrivé");
    const collector = channel.createMessageCollector({ filter });

    console.log(`Listening for messages containing the specific phrase in channel: ${channel.name}`);

    collector.on('collect', async (message) => {
      console.log(`Collected message from ${message.author.username}: ${message.content}`);

      // Introduce a random delay between 3 and 8 seconds
      const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
      console.log(`Waiting for ${delay / 1000} seconds before processing...`);
      await wait(delay);

      // Regular expression to match and extract code blocks
      const codeRegex = /\|\|([A-Za-z0-9\-]+)\|\|/g;
      const matches = [...message.content.matchAll(codeRegex)].map(match => match[1]);

      if (matches.length > 0) {
        console.log("Extracted code blocks:");
        const token = await getToken(); // Fetch the token

        for (const [index, code] of matches.slice(0, 5).entries()) {
          console.log(`${index + 1}: ${code}`);
          await makeRequest(code, token); // Make request for each code
        }
      } else {
        console.log("No code blocks found in the message.");
      }
    });

    collector.on('end', (collected) => {
      console.log(`Collector stopped. Collected ${collected.size} messages.`);
    });

  } catch (error) {
    console.error('Error fetching channel or setting up collector:', error);
  }
});

client.login(mySecret).catch(err => {
  console.error("Failed to log in:", err);
});
