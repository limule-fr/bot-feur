const http = require("http");

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot online");
});

server.listen(process.env.PORT || 3000, () => {
    console.log("KeepAlive actif");
});