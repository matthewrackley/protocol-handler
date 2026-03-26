
function handleParams (path, request) {
  let match = newMatchArray(path);
  const builtRequest = {};
  if (match) {
    if (match.hasParam) {
      if (request.params === null) {
        throw new Error("Route defines params in path but request params is null");
      }
      if (typeof request.params !== "object") {
        throw new TypeError("Request params must be an object if path includes params");
      }
      if (Object.keys(request.params).length === 0 || !Object.keys(request.params).includes(match.groups.param)) {
        throw new Error("Route defines params in path but request params does not include the expected parameter");
      }
      builtRequest.params = request.params;
      builtRequest.query = request.query;
      builtRequest.body = request.body;
    } else {
      builtRequest.params = null;
      builtRequest.query = request.query;
      builtRequest.body = request.body;
    }
  } else {
    throw new Error(`Invalid path format: ${ path }`);
  }
  return {
    path,
    request: builtRequest,
  }
}