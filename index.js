const core = require('@actions/core');
const github = require('@actions/github');
const AccessToken = require('twilio').jwt.AccessToken;
const axios = require('axios');

let twilioAccountSid;
let twilioApiKey;
let twilioApiSecret;

// Used specifically for creating Chat tokens
let serviceSid;

let mockServerURL;
let postmanEnvURL;
let mockServerEnvID;
let postmanAPIKey;

async function getIdentities () {
    const response = await axios.get(mockServerURL + 'test/scenarios');
    return response.data.scenarios.map((scenario) => scenario.identity);
}

function getTokens (identities) {
    return identities.map((identity) => {
        const ChatGrant = AccessToken.ChatGrant;
        // Create a "grant" which enables a client to use Chat as a given user,
        // on a given device
        const chatGrant = new ChatGrant({
            serviceSid: serviceSid,
        });
        
        // Create an access token which we will sign and return to the client,
        // containing the grant we just created
        const token = new AccessToken(
            twilioAccountSid,
            twilioApiKey,
            twilioApiSecret,
            {identity: identity, ttl:86400},
        );
        
        token.addGrant(chatGrant);
        
        jwtToken = token.toJwt();
        return jwtToken;
    });
}

async function updateTokens (tokens){
    const response = await axios({
        method: 'get',
        url: postmanEnvURL + mockServerEnvID,
        headers: { 
          'X-API-Key': postmanAPIKey
        }
      });

    const values = response.data.environment.values;
    const mockServerEnvName = response.data.environment.name;

    let valuesAsObject = {};
    values.forEach((value) => {
        valuesAsObject[value.key] = value.value
    });

    tokens.forEach((token, index) => {
        valuesAsObject[`jwt_token_${index}`] = token;
    })

    let requestValues = Object.keys(valuesAsObject).map((key) => ({
        key: key,
        value: valuesAsObject[key],
    }));

    const requestData = {
        environment: {
            name: mockServerEnvName,
            values: requestValues
        }
    }
      
    var config = {
        method: 'put',
        url: postmanEnvURL + mockServerEnvID,
        headers: { 
            'X-API-Key': postmanAPIKey, 
            'Content-Type': 'application/json'
        },
        data : JSON.stringify(requestData)
    };

    await axios(config);
}

async function run(){
    try {
        // Used when generating any kind of tokens
        twilioAccountSid = core.getInput('twilioAccountSid');
        twilioApiKey = core.getInput('twilioApiKey');
        twilioApiSecret = core.getInput('twilioApiSecret');
    
        // Used specifically for creating Chat tokens
        serviceSid = core.getInput('serviceSid');
    
        mockServerURL = core.getInput('mockServerURL');
        postmanEnvURL = core.getInput('postmanEnvURL');
        mockServerEnvID = core.getInput('mockServerEnvID');
        postmanAPIKey = core.getInput('postmanAPIKey');
      
        const identities = await getIdentities();
        const tokens = getTokens(identities);
        await updateTokens(tokens);
    
        core.setOutput("status", "successfully update the jwt tokens.");
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();






