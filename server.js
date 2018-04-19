// basic variables
// qqzhoucn@gmail.com 20180419
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs'); // required for file serving

var protobuf = require("protobufjs/light");
var users = [];
var user;

//var tcpClient = require(__dirname +'/tcp-client.js');

function postImage(socket) {

    //var filepath = 'd:/temp/heart.jpg';
    //var filepath = 'd:/temp/CT1.bmp';
    var files;
    files = walkSync('d:/temp/', files);
    var lastFile;
    for (var fi in files) {
        console.log('file:' + files[fi]);
        lastFile = files[fi];
    }

    var filepath = 'd:/temp/' + lastFile;
    console.log('filepath:' + filepath);
    //var buf = fs.readFileSync(__dirname + '\\pic.jpg');
    fs.stat(filepath, function (err, stat) {
        if (err == null) {
            console.log('File exists');
            var buf = fs.readFileSync(filepath);
            //fs.readFileSync(__dirname + '/pic.jpg', function(err, buf){
            // it's possible to embed binary data
            // within arbitrarily-complex objects
            //socket.emit('image', { image: true, buffer: buf });
            socket.emit('image', { image: true, buffer: buf.toString('base64') });
            console.log('image file is initialized');

            socket.emit('message', filepath);
        } else if (err.code == 'ENOENT') {
            // file does not exist
            fs.writeFile('log.txt', 'Some log\n');
        } else {
            console.log('Some other error: ', err.code);
        }
    });

}

var net = require('net');
var client = new net.Socket();

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function intArray2int(buf) {
    var len = 0;
    for (var i = 0; i < 8; ++i) {
        len += buf[i] * Math.pow(2, i * 8);
    }
    return len;
}


function base64EncodingUTF8(str) {
    var encoded = new TextEncoderLite('utf-8').encode(str);
    var b64Encoded = base64js.fromByteArray(encoded);
    return b64Encoded;
}


function savPng(filename, data) {
    var base64Data = data;//data.toString('base64');
    //var bufdata = new Buffer(base64Data, 'base64');
    // Save decoded binary image to disk
    try {

        fs.writeFile(filename, base64Data, { encoding: 'base64' }, function (err) {
            //Finished
            console.log(err);
        });
    }
    catch (error) {
        console.log('ERROR:', error);
    }
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}
function toBuffer(ab) {
    var buf = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

var PACKETHEADERLEN = 8;
function parseBuffer(client, data, args) {

    var len = data.length;
    //console.log('Received size: ' + len);

    args.recvedThisTimeLen = len;

    //args.recvedThisTimeLen = Buffer.byteLength(data);
    var tmpBuffer = new Buffer(args.accumulatingLen + args.recvedThisTimeLen);
    args.accumulatingBuffer.copy(tmpBuffer);
    data.copy(tmpBuffer, args.accumulatingLen); // offset for accumulating
    args.accumulatingBuffer = tmpBuffer;
    tmpBuffer = null;
    args.accumulatingLen = args.accumulatingLen + args.recvedThisTimeLen;

    if (args.accumulatingLen < PACKETHEADERLEN) {
        return;
    } else if (len === PACKETHEADERLEN) {
        var fileLength = intArray2int(data);
        if (fileLength < 8) {
            return;
        }
        args.accumulatingLen = 0;
        args.totalPacketLen = fileLength;
        args.sent = 0;
        return;
    }
    if (args.accumulatingLen >= args.totalPacketLen && args.totalPacketLen > 0 && args.sent == 0) {
        //var aPacketBufExceptHeader = new Buffer(args.totalPacketLen); // a whole packet is available...
        //var totalPacket = toArrayBuffer(args.accumulatingBuffer);

        ////////////////////////////////////////////////////////////////////
        //process packet data
        g_Index++;
        for (var u = 0; u < users.length; ++u) {

            users[u].emit('image', { image: true, buffer: args.accumulatingBuffer.toString('base64') });
            users[u].emit('message', 'count:' + g_Index.toString());
        }
        // user.emit('image', { image: true, buffer: args.accumulatingBuffer.toString('base64') });
        // user.emit('message', 'count:' + g_Index.toString());
        console.log('sent image file to client');



        args.sent = 1;
        args.totalPacketLen = 0;
        //console.log('g_FileBuffer.length: ' + args.totalPacketLen);
        //var file_name = "d:/temp/js_" + g_Index + ".png";
        //savPng(file_name, args.totalPacketLen);
    }
}

///
/*
And connect with a tcp client from the command line using netcat, the *nix 
utility for reading and writing across tcp/udp network connections.  I've only 
used it for debugging myself.
$ netcat 127.0.0.1 1337
You should see:
> Echo server
*/

/* Or use this example tcp client written in node.js.  (Originated with 
example code from 
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */


client.connect(3000, '127.0.0.1', function () {
    console.log('Connected');
    //client.write('Hello, server! Love, Client.');
    //var str = "00000010";
    //str = str + "0123456789";
    //client.write(str);
});

var g_FileLength = 0;
var g_FileGot = 0;
var g_FileBuffer;
var g_Index = 0;

var args = {};
args.accumulatingBuffer = new Buffer(0);
args.totalPacketLen = -1;
args.accumulatingLen = 0;
args.recvedThisTimeLen = 0;
args.sent = 0;

client.on('data', function (data) {
    var buffer = new Buffer(data);
    parseBuffer(client, buffer, args);
});

/*
client.on('data', function (data) {
    var len = data.length;
    console.log('Received size: ' + len);
    //client.destroy(); // kill client after server's response
    //var str = ab2str(data);
    //console.log('string: ' + str.length);
    if (len < 10) {
        console.log('string: ' + ab2str(data));
    }
    if (len == 8) {
        //console.log('Received: ' + data);
        g_FileLength = intArray2int(data);
        console.log('g_FileLength: ' + g_FileLength);
        g_FileGot = 0;
        g_FileBuffer = new Uint8Array(g_FileLength);
    }
    if (len > 8 && g_FileBuffer != undefined) {
        if (g_FileGot < g_FileLength && g_FileGot == 0) {
            g_FileBuffer.set(data, g_FileGot);
        }
        g_FileGot += len;
        console.log('g_FileGot: ' + g_FileGot);
        //console.log('data: ' + data.subarray(0, 30));
        if (g_FileGot >= g_FileLength) {
            user.emit('image', { image: true, buffer: data.toString('base64') });
            console.log('sent image file to client');
            g_Index++;
            console.log('g_FileBuffer.length: ' + g_FileBuffer.length);
            console.log('g_FileBuffer.toString(base64).length: ' + g_FileBuffer.toString('base64').length);
            var file_name = "d:/temp/js_" + g_Index + ".png";
            savPng(file_name, g_FileBuffer);
        }

        /*
                var substring = "d:/";
                var filepath;
                var index = str.indexOf(substring);
                if (index !== -1) {
                    console.log('index:' + index);
                    console.log('str.length:' + str.length);
                    filepath = str.substring(index, str.length);
                    var socket = user;
                    fs.stat(filepath, function (err, stat) {
                        if (err == null) {
                            console.log('File exists');
                            var buf = fs.readFileSync(filepath);
                            //fs.readFileSync(__dirname + '/pic.jpg', function(err, buf){
                            // it's possible to embed binary data
                            // within arbitrarily-complex objects
                            //socket.emit('image', { image: true, buffer: buf });
                            socket.emit('image', { image: true, buffer: buf.toString('base64') });
                            console.log('image file is initialized');
        
                            socket.emit('message', filepath);
                        } else if (err.code == 'ENOENT') {
                            // file does not exist
                            console.log('file does not exist:' + filepath);
                            fs.writeFile('log.txt', 'Some log\n');
                        } else {
                            console.log('Some other error: ', err.code);
                        }
                    });
                }
                
    }
});
*/

client.on('close', function () {
    console.log('Connection closed');
});

///
// protobuf.load(__dirname + "/rt_tps_command_context.proto")
//     .then(function(root) {
//     // Obtain a message type
//     //var AwesomeMessage = root.lookupType("tps.proto.RtTpsCommandContext");
//     });

/////

http.listen(8090, '10.9.19.13', function () {
    console.log('listening on *:8090');
});

// location to index.html
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// only to test chat sample code from sample
// io.on('connection', function(socket){

//   console.log('a user connected');
//     // broadcast a message
//   socket.broadcast.emit('chat message', 'System Broadcast Message: a user has been connected');
//   socket.on('chat message', function(msg){
//     io.emit('chat message', msg);
//   });



// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function (dir, filelist) {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        }
        else {
            filelist.push(file);
        }
    });
    return filelist;
};

function sleep(time, callback) {
    var stop = new Date().getTime();
    while (new Date().getTime() < stop + time) {
        ;
    }
    callback();
}



// trying to serve the image file from the server
io.on('connection', function (socket) {
    console.log('a user connected');
    user = socket;
    users.push(user);
    postImage(socket);

    socket.on('next', function (message) {
        console.log('On Next:' + message);
        var str = "00000001";
        str = str + "1";
        client.write(str);
        //sleep(2000, function () {
        // executes after one second, and blocks the thread

        //postImage(socket);
        //});
    });

    socket.on('prev', function (message) {
        console.log('On Prev:' + message);
        var str = "00000001";
        str = str + "2";
        client.write(str);
        // sleep(2000, function () {
        //     postImage(socket);
        // });
    });
});


