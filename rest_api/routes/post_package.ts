import { Router, Request, Response } from 'express';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { promises as fs } from 'fs';
import * as fileSystem from 'fs';
import * as archiver from 'archiver';
import * as pathModule from 'path';
import * as AdmZip from 'adm-zip';
let getGithubUrl = require('get-github-url');
import { FieldPacket, RowDataPacket } from 'mysql2';

import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from "../db";
import { getAllRatings, fetchNpmDataWithAxios, getGithubUrlFromNpmData } from "../../rate/analyze"
import { logger } from "../../logger_cfg";
import { PackageRating} from "../../schema";

const router = Router();
const exec = promisify(execCallback);
const readFileAsync = promisify(fileSystem.readFile);
let table = `${dbName}.${tableName}`

router.post('/', async (req: Request, res: Response) => {
    logger.info('POST package/');
    const { Content, JSProgram, URL } = req.body as schema.PackageData;
    logger.info(`Iniitiating POST request for ${req}`);

    deleteZipFiles('rest_api');
    /** delete 'dump' directory if it exists **/
    await fs.rm('rest_api/dump', { recursive: true, force: true }).catch(err => {
        logger.debug(`Clearing directory for cloning`);
        if (err.code !== 'ENOENT') {
            return res.status(503).json({
                err: `Unexpected : ${err}`,
            });
        }
    });

    /** checks if only either Content or URL is being passsed when inserting a package **/
    if (!((Content && JSProgram && !URL) || (URL && JSProgram && !Content))) {
        logger.error(`Failed POST request. Error 400`);
        return res.status(400).json({
            error: "There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.",
        });
    }

    /** establish the connection the database **/
    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error(`Failed POST request. Error 503`);
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    let name: string = '';
    let version: string = '';
    let url: any = '';
    let id: string = '';


    if (URL) {
        logger.info('POST /package (by URL)');
        if (URL.includes('npmjs.com')) {
            try {
                let package_name = URL.replace('https://www.npmjs.com/package/', '');
                package_name = package_name.replace('/', '');
                const data = await fetchNpmDataWithAxios(package_name);
                url = getGithubUrlFromNpmData(data);
            } catch (error) {
                logger.error('Invalid URL: ' + url);
                return res.status(503).json({
                    error: `Invalid URL Link.`,
                });
            }

        } else {
            url = URL;
        }

        try {
            await downloadRepo(url, 'rest_api/dump');
            logger.debug(`Downloading repository ${url}`);
        } catch (error) {
            logger.error(`Failed POST request. Error 503`);
            return res.status(503).json({
                error: `Invalid GitHub Link. ${error}`,
            });
        }

    } else if (Content) {
        logger.info('POST /package (by Content)');
        try {
            await decodeBase64AndExtract(Content, 'rest_api/dump');
            logger.debug(`Extracting Content from request body`);
        } catch (error) {
            logger.error(`Failed POST request. Error 503`);
            return res.status(503).json({
                error: `Couldn't read zip file. ${error}`,
            });
        }
    }

    try {
        logger.debug(`Extracting info from package.json`);
        const packageJsonPath = pathModule.join('rest_api/dump', 'package.json')
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);


        const pathParts = url.split('/');
        const nonEmptyParts = pathParts.filter((part: string) => part.trim() !== '');
        const projectName = nonEmptyParts[nonEmptyParts.length - 1];

        if (!URL) {
            url = getGithubUrl(packageJson.repository.url as string);
        }
        name = packageJson.name;
        if (!name) {
            name = projectName;
        }
        version = packageJson.version;
        if (!version) {
            throw Error(
                'No version found in the package'
                );
        }
        id = name + "_" + version;

    } catch (error) {
        logger.error(`Failed POST request. Error 503`);
        return res.status(503).json({
            error: `Failed to open the package.json file and/or other error. ${error}`,
        });
    }

    /** check if package already exists in the database **/
    let packageExists;
    try {
        logger.debug(`Checking if package already exists in the database`);
        const [existingRows] = await connection.execute(
            `SELECT * FROM ${table} WHERE name = ? AND version = ?`, [name, version]
            ) as [RowDataPacket[], FieldPacket[]];
        packageExists = existingRows.length > 0;

    } catch (error) {
        logger.error(`Failed POST request. Error 503`);
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    if (packageExists) {
        logger.error(`Failed POST request. Error 409`);
        return res.status(409).json({
            error: "Package exists already."
        });
    }
    let zipResult;
    try {
        zipResult = await ZIP('../dump', name, version, 'rest_api', res);
    } catch (error) {
        return res.status(503).json({
            error: `Package length is too big. ${error}`
        });
    }
    const { fileContent, outputZipPath }: { fileContent: string, outputZipPath: string } = zipResult;

    let packageRating: PackageRating = await getAllRatings(url);

    // Check the NetScore in the rating
    //if (packageRating && packageRating.NetScore !== -1 && packageRating.NetScore < 0.5) {
    if(packageRating && (packageRating.NetScore < 0.5 || packageRating.BusFactor < 0.5 || packageRating.Correctness < 0.5 || 
        packageRating.RampUp < 0.5 || packageRating.ResponsiveMaintainer < 0.5 || packageRating.LicenseScore < 0.5)) {
        logger.error(`Failed POST request. Error 424`);
        return res.status(424).json({
            error: "Package is not uploaded due to the disqualified rating."
        });
    }

    /** database entry **/
    let responseData : schema.Package;
    let result;
    try {
        logger.info(`Iniitiating Database request`);
        const results = await connection.execute(
            `INSERT INTO ${table} (ID, Name, Version, URL, JSProgram, Content,
                BUS_FACTOR_SCORE,
                CORRECTNESS_SCORE,
                RAMP_UP_SCORE,
                RESPONSIVE_MAINTAINER_SCORE,
                LICENSE_SCORE,
                PINNED_PRACTICE_SCORE,
                PULL_REQUEST_RATING_SCORE,
                NET_SCORE
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            , [id,
               name,
               version,
               url,
               JSProgram,
               fileContent,
               packageRating.BusFactor,
               packageRating.Correctness,
               packageRating.RampUp,
               packageRating.ResponsiveMaintainer,
               packageRating.LicenseScore,
               packageRating.GoodPinningPractice,
               packageRating.PullRequest,
               packageRating.NetScore]) as any;
        result = results;

    } catch (error) {
        logger.error(`Failed POST request. Error 503`);
        return res.status(503).json({
            error: `Failed to insert URL to the database. Please try again later. ${error}`
        });
    }

    if (URL) {
        responseData = {
            metadata: { Name: name, Version: version, ID: id },
            data: { URL, JSProgram }
        };
    } else {
        responseData = {
            metadata: { Name: name, Version: version, ID: id },
            data: { Content, JSProgram }
        }
    }

    /** delete 'dump' directory if it exists **/
    await fs.rm('rest_api/dump', { recursive: true, force: true }).catch(error => {
        if (error.code !== 'ENOENT') {
            logger.error(`Failed to delete directory. Error 503`);
            return res.status(503).json({
                error: `Failed to delete directory ${error}`
            });
        }
    });

    if (fileSystem.existsSync(outputZipPath)) {
        fileSystem.rmSync(outputZipPath, { recursive: true });
    }

    await connection.end();
    logger.info(`Completing POST request`);
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
            new Promise((_, reject) => setTimeout(() => reject(new Error(failed)), 90000))
        ]);
    } catch (error) {
        throw error;
    }

    /** return path of 'dump' **/
    return path;
}

export async function ZIP(sourcePath: string, name: string, version: string, filePath: string, res?: Response) {

    const sourceDirectory = pathModule.join(__dirname, sourcePath);
    const zipFileName = `${name} [${version}].zip`;
    const outputZipPath: string = `${filePath}/${zipFileName}`;
    const outputZipStream = fileSystem.createWriteStream(outputZipPath);
    const archive = archiver('zip', {
        zlib: { level: 9 },
    });

    archive.pipe(outputZipStream);

    archive.directory(sourceDirectory, '/');

    const fileContentPromise = new Promise((resolve, reject) => {
        outputZipStream.on('close', () => {
            readFileAsync(outputZipPath, { encoding: 'base64' })
                .then(resolve)
                .catch(reject);
        });
    });

    archive.on('error', (error: string) => {
        if (res) {
            return res.status(503).json({
                error: `Error creating the zip file: ${error}`,
            });
        }
    });

    archive.finalize();

    try {
        await fileContentPromise;
    } catch (error) {
        throw error;
    }

    let fileContent: string = await fileContentPromise as string;
    return { fileContent, outputZipPath };
}

export async function decodeBase64AndExtract(base64String: string, outputPath: string) {
    const cleanedBase64String = base64String.replace(/\s/g, '');
    const zip = new AdmZip(Buffer.from(cleanedBase64String, 'base64'));

    // Extract the contents of the zip file directly to the output path
    zip.extractAllTo(outputPath, /*overwrite*/ true);

    const outputEntries = fileSystem.readdirSync(outputPath);
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
}

function deleteZipFiles(directoryPath: string): void {
    fileSystem.readdir(directoryPath, (err, files) => {
        if (err) {
            throw err;
        }

        // Filter the files to only include zip files
        const zipFiles = files.filter((file) => file.endsWith('.zip'));

        // Delete each zip file
        zipFiles.forEach((file) => {
            const filePath = pathModule.join(directoryPath, file);

            fileSystem.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
//                    throw err;
                } else {
                }
            });
        });
    });
}

export default router;