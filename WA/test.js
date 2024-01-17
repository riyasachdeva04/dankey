const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');

const modelPath = '../model/dankey.py';

var memeLinkFromModel = runPythonScript();
runPythonScript('hello')
    .then(memeLinkFromModel => {
        console.log('Image link:', memeLinkFromModel);
        downloadImage(memeLinkFromModel, './media/downloaded_meme.jpg'); // wait for promise to return
    })
    .catch(error => console.error('Error:', error));

// function to run the python script & pass it the input text as an arg
function runPythonScript(inputText) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [modelPath, inputText]);
        let output = '';

        pythonProcess.stdout.on('data', (data) => {
            console.log("Received data chunk:", data.toString());
            output += data.toString();
        });

        pythonProcess.on('close', () => {
            // Split the output by newlines and get the last non-empty line
            const lines = output.split('\n').filter(line => line.trim() !== '');
            const lastLine = lines[lines.length - 1];
            resolve(lastLine);
            console.log('Model Output is:', lastLine);
        });


        pythonProcess.stderr.on('data', (data) => {
            console.error("Error from Python script:", data.toString());
            reject(data.toString());
        });
    });
}

// function to download the image using axios and save it
// !! CAN BE ABUSED
function downloadImage(url, filepath) {
    if (!url) {
        console.error('Invalid URL provided for download');
        return;
    }

    axios({
        url,
        responseType: 'stream',
    }).then(response => {
        // This will overwrite the file at 'filepath' if it already exists
        response.data.pipe(fs.createWriteStream(filepath));
    }).catch(error => {
        console.error('Error downloading the image:', error);
    });
}