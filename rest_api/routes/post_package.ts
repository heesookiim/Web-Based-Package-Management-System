
import { Router, Request, Response } from 'express';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { promises as fs } from 'fs';
import * as fileSystem from 'fs';
import * as archiver from 'archiver';
import * as path from 'path';

import * as schema from '../schema';
import { connectToDatabase } from "../db";

/**
USE packages;
CREATE TABLE packages (Name VARCHAR(255), Version VARCHAR(255), ID INT AUTO_INCREMENT PRIMARY KEY, Content LONGTEXT, URL TEXT, JSProgram MEDIUMTEXT, NET_SCORE FLOAT, RAMP_UP_SCORE FLOAT, CORRECTNESS_SCORE FLOAT, BUS_FACTOR_SCORE FLOAT, RESPONSIVE_MAINTAINER_SCORE FLOAT, LICENSE_SCORE FLOAT, PINNED_RATING_SCORE FLOAT, PULL_REQUEST_RATING_SCORE FLOAT);
DROP packages;
SELECT * FROM packages;
**/

const router = Router();
const exec = promisify(execCallback);
const readFileAsync =
promisify(fileSystem.readFile);

router.post('/', async (req: Request, res: Response) => {
    const { Content, JSProgram, URL } = req.body as schema.PackageData;
    if (fileSystem.existsSync('rest_api/dump')) {
        fileSystem.rmSync('rest_api/dump', { recursive: true });
    }
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

    /** get the number of packages from the database to set the ID **/
    let packagesCount: number;
    try {
        const [results] = await connection.execute(
            'SELECT COUNT(*) as rowCount FROM packages'
            );
        packagesCount = results[0].rowCount;
    } catch (error) {
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    let name: string = '';
    let version: string = '';
    let id: number = packagesCount + 1;

    /** download the repo from the link and extract information **/
    if (URL) {
        try {
            const packageJsonPath = await downloadRepo(URL);
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            name = packageJson.name;
            version = packageJson.version;
        } catch (error) {
            return res.status(503).json({
                error: `Failed to open the package.json file and/or package.json doesn't contain name/version. Error: ${error}`,
            });
        }
    } else if (Content) {

    }

    /** check if package already exists in the database **/
    let packageExists;
    try {
        const [existingRows] = await connection.execute(
            'SELECT * FROM packages WHERE name = ? AND version = ?', [name, version]
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
    const sourceDirectory = path.join(__dirname, '../dump');
    const zipFileName = `${name} [${version}].zip`;
    const outputZipPath = `rest_api/${zipFileName}`;
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
    const fileContent = await fileContentPromise;

    /** database entry **/
    let responseData : schema.Package;
    if (URL) {
        try {
            const [results] = await connection.execute(
                'INSERT INTO packages (Name, Version, ID, URL, JSProgram, Content) VALUES (?, ?, ?, ?, ?, ?)'
                , [name, version, id, URL, JSProgram, fileContent]);
            responseData = {
                metadata: { Name: name, Version: version, ID: id.toString() },
                data: { URL, JSProgram }
            };

        } catch (error) {
            return res.status(500).json({
                error: `Failed to insert URL to the database. Please try again later. ${error}`
            });
        }

    } else if (Content) {

    }

    if (fileSystem.existsSync('rest_api/dump')) {
        fileSystem.rmSync('rest_api/dump', { recursive: true });
    }
    if (fileSystem.existsSync(outputZipPath)) {
        fileSystem.rmSync(outputZipPath, { recursive: true });
    }
    await connection.end();
    return res.status(201).json(responseData);
});

async function downloadRepo(url: string)  {

    /** Create 'dump' directory if it doesn't exist **/
    await fs.mkdir('rest_api/dump').catch(err => {
        if (err.code !== 'EEXIST') {
            console.error(`Error creating directory: ${err}`);
        }
    });

    try {
        await exec(`git clone ${url} rest_api/dump`);
    } catch (error) {
        throw error;
    }

    return path.join(`rest_api/dump`, 'package.json');
}

export default router;