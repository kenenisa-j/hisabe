const fs = require('fs');
const path = require('path');
const https = require('https');

const moreBanks = {
    'cbebirr': 'combanketh.et',
    'hijra': 'hijra-bank.com',
    'zamzam': 'zamzambank.com',
    'gadaa': 'gadaabank.com',
    'tsedey': 'tsedeybank.com.et',
    'shabelle': 'shabellebank.com',
    'rammis': 'rammisbank.com',
    'ahadu': 'ahadubank.com'
};

const outputDir = path.join(__dirname, '..', 'public', 'logos');

function download(name, domain) {
    return new Promise((resolve) => {
        const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const filePath = path.join(outputDir, `${name}.png`);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                https.get(response.headers.location, (res2) => {
                    res2.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`Saved ${name}.png`);
                        resolve();
                    });
                });
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Saved ${name}.png`);
                    resolve();
                });
            }
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            console.error(`Error ${name}:`, err.message);
            resolve();
        });
    });
}

async function run() {
    for (const [name, domain] of Object.entries(moreBanks)) {
        await download(name, domain);
    }
    console.log('Finished downloading additional bank icons!');
}

run();
