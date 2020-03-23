const ws = require("websocket");
const uuid = require("uuid");
const http = require("http");
const fs = require('fs');
const index = fs.readFileSync('index.html');

const port = process.env.PORT || 80

const PROTOCOL_NAME = "dice"

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(index);
});

const wsServer = new ws.server({
  httpServer: server,
  autoAcceptConnections: false,
});

const isOriginAllowed = () => {
  return true;
}

function dice(max) {
  return Math.floor(Math.random() * Math.floor(max)) + 1;
}

let connections = {};

wsServer.on("request", req => {
  if (!isOriginAllowed(req.origin)) {
    req.reject();
    console.log((new Date()) + " Connection from origin " + req.origin + " rejected");
    return;
  }

  const connection = req.accept(PROTOCOL_NAME, req.origin);
  connection.id = uuid.v4();
  console.log((new Date()) + " Connection request accepted");
  connections = {
    ...connections,
    [connection.id]: connection
  };

  connection.on("message", message => {
    if (message.type === "utf8") {
      const { event, payload } = JSON.parse(message.utf8Data);
      switch (event) {
        case 'dice/roll':
          const { diceValue } = payload;
          const roll = dice(diceValue);
          Object.values(connections).forEach(connection => {
            connection.send(JSON.stringify({ event: 'dice/roll', payload: { value: roll } }))
          })
      }
      console.log(connection.id,event,payload);
    }
  });

  connection.on("close", () => {
    console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected");
    delete connections[connection.id];
  });
});

server.listen(port, () => {
  console.log((new Date()) + " Server is listening on port " + port);
});
