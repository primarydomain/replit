const dotenv = require("dotenv");
dotenv.config();

const fs = require('fs');
const { exec } = require('child_process');
const http = require('http')
const express = require('express')
const path = require('path')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const PORT = process.env.PORT || 5000

var app = express();
var server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

function bash(command) {
  return new Promise((resolve, reject) => {
    var result = '<pre>';
    const ls = exec(command, function (error, stdout, stderr) {
      if (error) {
        result += 'Error code: \n' + error.code;
        result += 'Signal received: \n' + error.signal;
        result += '</pre>';
        reject(result);
      }
      result += 'Child Process STDOUT: \n' + stdout;
      result += 'Child Process STDERR: \n' + stderr;
      result += '</pre>';
      resolve(result);
    });
    ls.on('exit', function (code) {
      result += 'Child process exited with exit code: ' + code + '\n';
    });
  });
}

app.post("/pull", upload.single('file'), (request, response) => {
  fs.rename(request.file.path, request.file.originalname, (err) => {
    if (err) return response.json(err);
    var env = "";
    for (var key in request.body) {
      env += `export ${key}=${request.body[key]} && `
    }
    bash(`${env}bash pull ${request.file.originalname}`)
      .then(result => response.end(result))
      .catch(result => response.end(result));
  });
});
app.get("/pull", (request, response) => {
  bash(`bash pull`)
    .then(result => response.end(result))
    .catch(result => response.end(result));
});

app.post("/api/command", function (request, response) {
  bash(request.body.command)
    .then(result => response.send({ "name": result }))
    .catch(result => response.send({ "name": result }))
});
app.post("/api/visitors", function (request, response) {
  var userName = request.body.name;
  var doc = { "name": userName };
  response.send(doc);
});

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/hello', (req, res) => res.render('pages/hello'))
  .get('/whoami', (req, res) => res.render('pages/whoami'))
  .get('/status', (req, res) => res.json({ "status": "OK", timestamp: Date.now() }))

server.listen(PORT, () => console.log(`Listening on ${PORT}`))

fs.appendFile('pids', `${process.pid} `, () => { });

function getTimestamp() {
  var d = new Date();
  var localTime = d.getTime();
  var localOffset = d.getTimezoneOffset() * 60000;
  var utc = localTime + localOffset;
  var offset = 8; //Shanghai
  var shanghai = utc + (3600000 * offset);
  var nd = new Date(shanghai);
  var timestamp = nd.toString();
  return timestamp
}
if (process.env.REPL_SLUG && process.env.pm_id && process.env.pm_id == 0) {
  var whoami = "<pre>\n"
  whoami += (new Date()).toString() + "\n";
  whoami += getTimestamp().toString() + "\n";
  whoami += `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co\n`
  whoami += "</pre>\n"
  fs.writeFile("views/pages/whoami.ejs", whoami, () => { });
}

function quit(signal) {
  server.close(() => {
    if (process.env.test_pid) {
      process.kill(process.env.test_pid);
    }
    // MUST use Sync functions!!!
    try {
      var data = fs.readFileSync("pids", "utf8");
      fs.writeFileSync("pids", data.replace(`${process.pid} `, ""));
    } catch (err) { }
    process.exit(0);
  });
}

process.on('SIGINT', () => quit('SIGINT'));
process.on('SIGTERM', () => quit('SIGTERM'));
