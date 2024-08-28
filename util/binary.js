// util.js

const fs = require('fs').promises;
const path = require('path');

// Async function to read and sort .bin files by the last segment after splitting by '_'
async function sortBinFilesAsync(folderPath) {
    try {
        // Read directory
        const files = await fs.readdir(folderPath);

        // Filter .bin files
        const binFiles = files.filter(file => file.endsWith('.bin'));

        // Sort based on the last segment after splitting by '_'
        binFiles.sort((file1, file2) => {
            const parts1 = file1.split('_');
            const parts2 = file2.split('_');
            const lastPart1 = parts1[parts1.length - 1];
            const lastPart2 = parts2[parts2.length - 1];

            // Assuming the last part is a sortable string or number
            return lastPart1.localeCompare(lastPart2, undefined, { numeric: true });
        });

        // Create array of absolute file paths
        const filePaths = binFiles.map(file => path.join(folderPath, file));

        return filePaths;
    } catch (err) {
        throw new Error(`Error sorting .bin files: ${err.message}`);
    }
}

async function readBinaryFile(filePath) {
    try {
        const content = await fs.readFile(filePath);
        return content;
    } catch (err) {
        throw new Error(`Error reading file: ${err.message}`);
    }
}

module.exports = {
    sortBinFilesAsync,
    readBinaryFile
};
