// // You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage

const net = require('net');
const fs = require('fs'); 

async function processRequest(data) {
    const requestString = data.toString();
    const requestLines = requestString.split('\r\n');
    const [method, path] = requestLines[0].split(' ');

    let response;
    if (path.startsWith('/echo/')) {
        const echoContent = path.slice(6);
        response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${echoContent.length}\r\n\r\n${echoContent}`;
    } else if (path === '/user-agent') {
        const userAgentLine = requestLines.find(line => line.startsWith('User-Agent:'));
        const userAgent = userAgentLine ? userAgentLine.split(': ')[1] : '';
        response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`;
    } else if (path.startsWith('/files/')) {
        const fileName = path.slice(7);
        if(method === 'GET'){
            try {
                const data = await fs.promises.readFile(fileName, 'utf-8');
                response = [
                    'HTTP/1.1 200 OK',
                    'Content-Type: application/octet-stream',
                    `Content-Length: ${data.length}`,
                    '',
                    data
                ].join('\r\n');
            } catch (err) {
                response = 'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n';
            }
        }else if(method === 'POST'){
            const postContent = requestLines.slice(requestLines.indexOf('') + 1).join('\r\n');
            try{
                await fs.promises.writeFile(fileName, postContent, 'utf-8');
                response = 'HTTP/1.1 201 Created\r\n\r\n'
            } catch(e){
                response = 'HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n'
                console.log(e)
            }
        }
    } else if (path === '/') {
        response = 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n';
    } else {
        response = 'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n';
    }

    return response;
}
        

function newConn(socket) {
    console.log('new connection connected');
    
    socket.on('data', async (data) => {
        try {
            const response = await processRequest(data);
            socket.write(response);
            console.log('In newCOnn, response= ', response)
            socket.on("close", () => {
                socket.end();
                console.log('socket.end called')
                server.close();
                console.log('socket.close called')
            });
        } catch (error) {
            console.error('Error processing request:', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n');
        }

    });

    socket.on('error', (err) => {
        console.log('Socket error:', err);
    });
}

const server = net.createServer(newConn);

server.listen(4222, '127.0.0.1', () => {
    console.log('Server listening on port 4222');
});

