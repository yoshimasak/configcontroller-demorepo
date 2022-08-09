function createJwtToken(appId, privateKey) {
  const header = {
    'alg': 'RS256',
    'typ': 'JWT'
  };
  const payload = {
    iss: appId,
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 60
  };

  const encodedString = Utilities.base64Encode(JSON.stringify(header)) + '.' + Utilities.base64Encode(JSON.stringify(payload));
  const sigunature = Utilities.computeRsaSha256Signature(encodedString, privateKey);

  return encodedString + '.' + Utilities.base64Encode(sigunature);
}

function sendHttpRequest(url, method, credential, payload) {
  console.info("Start sending request to " + url);

  try {
    const response = UrlFetchApp.fetch(url, {
      method: method,
      "headers": {
        Authorization: `Bearer ${credential}`
      },
      payload: payload,
      muteHttpException: true
    });

    return response.getContentText();

  } catch (e) {
    console.error(e);
  }
}

function getGithubAccessToken(baseUrl, appId, installationId, privateKey) {
  const jwtToken = createJwtToken(appId, privateKey);
  const url = baseUrl + `/app/installations/${installationId}/access_tokens`;
  const response = sendHttpRequest(url, 'post', jwtToken, null);

  return JSON.parse(response).token;
}

function getFormValue(e) {
  var itemResponses = e.response.getItemResponses();
  return itemResponses;
}

function triggerGithubActions(baseUrl, accessToken, userName, repo, workflow, payload) {
  url = baseUrl + `/repos/${userName}/${repo}/actions/workflows/${workflow}/dispatches`;  
  console.log(url);

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      "headers": {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github+json'
      },
      payload: payload
    });
  } catch (e) {
    console.error(e);
  }
}

function main(e) {
  console.log("Start executing.");

  const formResponse = getFormValue(e);
  const departmentName = formResponse[0].getResponse();
  const serviceName = formResponse[1].getResponse();

  const baseUrl = "https://api.github.com";
  const properties = PropertiesService.getScriptProperties();
  const appId = properties.getProperty('appId');
  const installationId = properties.getProperty('installationId');
  const privateKey = properties.getProperty('privateKey').replace(/\\n/g, "\n");
  const accessToken = getGithubAccessToken(baseUrl, appId, installationId, privateKey);
  const userName = properties.getProperty('userName');
  const repo = properties.getProperty('repo');

  console.log(accessToken);

  const payload = {
    "ref": "dev",
    "inputs": {
      "departmentName": departmentName,
      "serviceName": serviceName
    }
  };

  console.log(JSON.stringify(payload));
  triggerGithubActions(baseUrl, accessToken, userName, repo, "create-landingzone.yaml", JSON.stringify(payload));
}