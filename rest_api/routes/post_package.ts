import { Router, Request, Response } from 'express';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { promises as fs } from 'fs';
import * as fileSystem from 'fs';
import * as archiver from 'archiver';
import * as pathModule from 'path';
import * as AdmZip from 'adm-zip'; // Import the 'adm-zip' module

import * as schema from '../schema';
import { connectToDatabase, dbName, tableName } from "../db";

/**
USE packages;
CREATE TABLE packages (Name VARCHAR(255), Version VARCHAR(255), ID INT AUTO_INCREMENT PRIMARY KEY, Content LONGTEXT, URL TEXT, JSProgram MEDIUMTEXT, NET_SCORE FLOAT, RAMP_UP_SCORE FLOAT, CORRECTNESS_SCORE FLOAT, BUS_FACTOR_SCORE FLOAT, RESPONSIVE_MAINTAINER_SCORE FLOAT, LICENSE_SCORE FLOAT, PINNED_RATING_SCORE FLOAT, PULL_REQUEST_RATING_SCORE FLOAT);
DROP packages;
SELECT * FROM packages;
**/

const router = Router();
const exec = promisify(execCallback);
const readFileAsync = promisify(fileSystem.readFile);
let table = `${dbName}.${tableName}`

router.post('/', async (req: Request, res: Response) => {
    const { Content, JSProgram, URL } = req.body as schema.PackageData;

    /** delete 'dump' directory if it exists **/
    await fs.rm('rest_api/dump', { recursive: true, force: true }).catch(err => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    });

    /** checks if only either Content or URL is being passsed when inserting a package **/
    if (!((Content && JSProgram && !URL) || (URL && JSProgram && !Content))) {
        return res.status(400).json({
            error: "There is missing field(s) in the PackageData or it is formed improperly.",
        });
    }

    /** establish the connection the database **/
    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    let name: string = '';
    let version: string = '';

    /** download the repo from the link and extract information **/
    if (URL) {
        try {
            await downloadRepo(URL, 'rest_api/dump');
        } catch (error) {
            return res.status(503).json({
                error: `Invalid GitHub Link. ${error}`,
            });
        }

    } else if (Content) {
        try {
            let zipPath = await decodeBase64AndExtract(Content, 'rest_api/dump');
        } catch (error) {
            return res.status(503).json({
                error: `Couldn't read zip file. ${error}`,
            });
        }
    }

    try {
        const packageJsonPath = pathModule.join('rest_api/dump', 'package.json')
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        name = packageJson.name;
        version = packageJson.version;
    } catch (error) {
        return res.status(503).json({
            error: `Failed to open the package.json file and/or package.json doesn't contain name/version. ${error}`,
        });
    }

    /** check if package already exists in the database **/
    let packageExists;
    try {
        const [existingRows] = await connection.execute(
            `SELECT * FROM ${table} WHERE name = ? AND version = ?`, [name, version]
            );
        packageExists = existingRows.length > 0;

    } catch (error) {
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    if (packageExists) {
        return res.status(409).json({
            error: "Package exists already."
        });
    }

    /** fetch metrics
    // Check the NetScore in the rating
    if (rating && rating.NetScore !== -1 && rating.NetScore <= 0.5) {
        return res.status(424).json({
            error: "Package is not uploaded due to the disqualified rating."
        });
    }
    **/

    /** create the zip file **/
    const zipResult = await ZIP('../dump', name, version, 'rest_api', res);
    const { fileContent, outputZipPath }: { fileContent: string, outputZipPath: string } = zipResult;

    /** database entry **/
    let responseData : schema.Package;
    if (URL) {
        try {
            const [results] = await connection.execute(
                `INSERT INTO ${table} (Name, Version, URL, JSProgram, Content) VALUES (?, ?, ?, ?, ?)`
                , [name, version, URL, JSProgram, fileContent]);
            responseData = {
                metadata: { Name: name, Version: version, ID: '`' },
                data: { URL, JSProgram }
            };

        } catch (error) {
            return res.status(500).json({
                error: `Failed to insert URL to the database. Please try again later. ${error}`
            });
        }

    } else if (Content) {
        try {
            const [results] = await connection.execute(
                `INSERT INTO ${table} (Name, Version, JSProgram, Content) VALUES (?, ?, ?, ?)`
                , [name, version, JSProgram, fileContent]);
            responseData = {
                metadata: { Name: name, Version: version, ID: '`' },
                data: { URL, JSProgram }
            };

        } catch (error) {
            return res.status(500).json({
                error: `Failed to insert URL to the database. Please try again later. ${error}`
            });
        }
    }

    /** delete 'dump' directory if it exists **/
    await fs.rm('rest_api/dump', { recursive: true, force: true }).catch(err => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    });

    if (fileSystem.existsSync(outputZipPath)) {
        fileSystem.rmSync(outputZipPath, { recursive: true });
    }

    await connection.end();
    return res.status(201).json(responseData);
});

export async function downloadRepo(url: string, path: string)  {

    /** delete 'dump' directory if it exists **/
    await fs.rm(path, { recursive: true, force: true }).catch(err => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    });

    /** create 'dump' directory if it doesn't exist **/
    await fs.mkdir(path).catch(err => {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    });

    let failed = 'The Repository does not exist or you do not have permission to access it.';
    try {
        await Promise.race([
            exec(`git clone ${url} ${path}`),
            new Promise((_, reject) => setTimeout(() => reject(new Error(failed)), 60000))
        ]);
    } catch (error) {
        throw error;
    }

    /** return path of 'dump' **/
    return path;
}

export async function ZIP(sourcePath: string, name: string, version: string, filePath: string, res) {
    const sourceDirectory = pathModule.join(__dirname, sourcePath);
    const zipFileName = `${name} [${version}].zip`;
    const outputZipPath: string = `${filePath}/${zipFileName}`;
    const outputZipStream = fileSystem.createWriteStream(outputZipPath);
    const archive = archiver('zip', {
        zlib: { level: 9 },
    });

    archive.pipe(outputZipStream);
    archive.directory(sourceDirectory, true);

    const fileContentPromise = new Promise((resolve, reject) => {
        outputZipStream.on('close', () => {
            readFileAsync(outputZipPath, { encoding: 'base64' })
                .then(resolve)
                .catch(reject);
        });
    });

    archive.on('error', (error: string) => {
        return res.status(503).json({
            error: `Error creating the zip file: ${error}`,
        });
    });

    archive.finalize();
    await fileContentPromise;
    let fileContent: string = await fileContentPromise as string;
    return { fileContent, outputZipPath };
}

async function decodeBase64AndExtract(base64String: string, outputPath: string) {
    const cleanedBase64String = base64String.replace(/\s/g, '');

    // Create an instance of AdmZip using the base64 data
    const zip = new AdmZip(Buffer.from(cleanedBase64String, 'base64'));

    // Extract the contents of the zip file directly to the output path
    zip.extractAllTo(outputPath, /*overwrite*/ true);

    // Get the list of entries in the output path
    const outputEntries = fileSystem.readdirSync(outputPath);

    // Determine the source and destination paths
    const sourcePath = pathModule.join(outputPath, outputEntries[0]);
    const destinationPath = pathModule.join(outputPath, 'contents');

    // Move the contents to 'rest_api/dump/contents'
    await fs.rename(sourcePath, destinationPath);

    // Move the contents from 'rest_api/dump/contents' to 'rest_api/dump'
    const contentsEntries = fileSystem.readdirSync(destinationPath);
    for (const entry of contentsEntries) {
        const entryPath = pathModule.join(destinationPath, entry);
        const destinationEntryPath = pathModule.join(outputPath, entry);
        await fs.rename(entryPath, destinationEntryPath);
    }

    // Remove the intermediate 'contents' folder
    await fs.rmdir(destinationPath);

    return outputPath; // Return the path of the final extracted contents in 'rest_api/dump'
}

export default router;
