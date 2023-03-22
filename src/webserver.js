const http = require("http");
const fs = require("fs");
const mimetypes = require("mime-types");
const path = require("path");
console.log("http server on port 8000");
const defaultHeaders = {
    "X-XSS-Protection": "1; mode=block",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "same-origin"
}
http.createServer(function(req, res){
    var index = fs.readFileSync("client/index.html");
    var blacklist = fs.readFileSync("src/BLACKLIST.csv").toString();
    blacklist = blacklist.split(",")
    if(!blacklist.includes(req.socket.remoteAddress)){
        var d = new Date();
        console.log(`[${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${("00" + d.getHours().toString()).slice(-2)}:${("00" + d.getMinutes().toString()).slice(-2)}:${("00" + d.getSeconds().toString()).slice(-2)}.${d.getMilliseconds()}][${req.socket.remoteAddress}] Incoming request to ${req.url}`)
        if(req.url == "/"){
            //default headers should include headers to prevent hijacking etc
            res.writeHead(200, {...{'Content-Type': 'text/html'}, ...defaultHeaders});
            res.write(index);
            res.end()
        }
        else if(req.url == "/discord"){
            res.writeHead(308, {"Location": "https://discord.gg/jKQEVT7Vd3"});
            res.end()
        }
        //prevent null chars & path traversal with ..
        else if(req.url.indexOf("\0") == -1 && !req.url.includes("..")){
            whitelist_dirs = ["assets", "scripts", "tmp", "favicon.ico"];
            try{
                isWhitelist = false;
                for(var i = 0; i<whitelist_dirs.length; i++){
                    if(req.url.startsWith("/" + whitelist_dirs[i])){
                        isWhitelist = true;
                    }
                }
                if(isWhitelist){
                    var baseDir = path.join(__dirname, "../client");
                    var filePath = path.join(baseDir, req.url);
                    var data = fs.readFileSync(filePath);
                    var ext = req.url.split(".");
                    ext = ext[ext.length-1];
                    res.writeHead(200, {'Content-Type': mimetypes.lookup(ext)});
                    res.write(data);
                    res.end()
                }
                else{
                    res.writeHead(404, {'Content-Type': "text/plain"});
                    res.end();
                }
            }
            catch(e){
                res.writeHead(404, {'Content-Type': "text/plain"});
                res.end();
            }
        }
    }
    //leave them hanging if they're blacklisted
}).listen(8000);