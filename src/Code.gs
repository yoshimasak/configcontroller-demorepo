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
      payload: JSON.stringify(payload)
    });
  } catch (e) {
    console.error(e);
  }
}

function addPropertiesToJson(originalJson, property, data) {
  var json = originalJson;
  json[property] = data;

  return json;
}

function main(e) {
  const baseUrl = "https://api.github.com";
  const properties = PropertiesService.getScriptProperties();
  const appId = properties.getProperty('appId');
  const installationId = properties.getProperty('installationId');
  const privateKey = properties.getProperty('privateKey').replace(/\\n/g, "\n");
  const accessToken = getGithubAccessToken(baseUrl, appId, installationId, privateKey);
  const userName = properties.getProperty('userName');
  const repo = properties.getProperty('repo');

  const formResponse = getFormValue(e);
  const department = formResponse[0].getResponse();
  const service = formResponse[1].getResponse();
  const folderAdmins = formResponse[2].getResponse();

  var setters_common = {
    "apiVersion": "v1",
    "kind": "ConfigMap",
    "metadata": {
      "name": "setters",
      "annotations": {
        "config.kubernetes.io/local-config": "true"
      }
    }
  };

  const hierarchy_setters_data = {
    "department": department,
    "service": service,
    "group-folder-admins": folderAdmins
  };

  const project_setters_data = {
    "folder-name": `${department}-${service}`,
    "project-id": `${department}-${service}`
  };

  const payload = {
    "ref": "main",
    "inputs": {
      "department": department,
      "service": service,
      "hierarchy_setters": JSON.stringify(addPropertiesToJson(setters_common, "data", hierarchy_setters_data)),
      "project_setters": JSON.stringify(addPropertiesToJson(setters_common, "data", project_setters_data))
    }
  };
  console.log(payload);

  triggerGithubActions(baseUrl, accessToken, userName, repo, "create-landingzone.yaml", payload);
}