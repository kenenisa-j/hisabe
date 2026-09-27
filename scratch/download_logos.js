const fs = require('fs');
const path = require('path');
const https = require('https');

const banks = {
    'cbe': 'combanketh.et',
    'telebirr': 'ethiotelecom.et',
    'abyssinia': 'bankofabyssinia.com',
    'awash': 'awashbank.com',
    'dashen': 'dashenbanksc.com',
    'hibret': 'hibretbank.com.et',
    'coopbank': 'coopbankoromia.com.et',
    'wegagen': 'wegagen.com',
    'nib': 'nibbanksc.com',
    'zemen': 'zemenbank.com',
    'enat': 'enatbanksc.com',
    'oromia': 'orombi.com',
    'berhan': 'berhanbanksc.com',
    'bunna': 'bunnabanksc.com',
    'amhara': 'amharabank.com.et',
    'siinqee': 'siinqeebank.com.et',
    'mpesa': 'safaricom.et',
    'paypal': 'paypal.com',
    'chapa': 'chapa.co'
};

const outputDir = path.join(__dirname, '..', 'public', 'logos');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

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
    for (const [name, domain] of Object.entries(banks)) {
        await download(name, domain);
    }
    console.log('Finished downloading official bank icons!');
}

run();
