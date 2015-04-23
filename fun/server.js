var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
}

function sendFile(response, filePath, fileContents) {
  response.writeHead(
    200,
    {"content-type": mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response);
          } else {
            cache[absPath] = data;
            sendFile(response, absPath, data);
          }
        });
      } else {
        send404(response);
      }
    });
  }
}

var server = http.createServer(function(request, response) {
  var filePath = false;
  if(request.method === "GET") {
    if (request.url == '/play') {
      filePath = 'public/index.html';
    } else if(request.url == '/report/'){
      filePath = 'public/report/index.html';
    }else if(request.url == '/poker/'){
      filePath = 'public/poker/html/poker.html';
    }else {
      filePath = 'public' + request.url;
    }
  }else if(request.method === "POST") {
    if (request.url === "/play"){
      //TODO update deck html globally. Need body-parser in express.
      //console.log(request)
    }
  }
  var absPath = './' + filePath;
  serveStatic(response, cache, absPath);
});

server.listen(3333, function() {
  console.log("Server listening on port 3333.");
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
