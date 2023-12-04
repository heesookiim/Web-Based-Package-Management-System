import { Router, Request, Response } from 'express';
import { PackageData, PackageID, PackageMetadata } from '../../schema';
import { connectToDatabase, tableName, dbName } from "../db";
import { downloadRepo, ZIP, decodeBase64AndExtract } from './post_package';
import { RowDataPacket } from 'mysql2';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../../logger_cfg";
import { fetchNpmDataWithAxios, getGithubUrlFromNpmData } from "../../rate/analyze";

const router = Router();
let table = `${dbName}.${tableName}`;

export async function deleteAllZipFiles(directory: string): Promise<void> {
    try {
        logger.info(`Deleting all ZIP files in directory: ${directory}`);
        const files = fs.readdirSync(directory);
        for (const file of files) {
            if (path.extname(file) === '.zip') {
                fs.unlinkSync(path.join(directory, file));
                logger.debug(`Deleted ZIP file: ${file}`);
            }
        }
        logger.info('Successfully deleted all ZIP files');
    } catch (error) {
        logger.error(`Error deleting ZIP files: ${error}`);
        throw new Error(`Error deleting ZIP files: ${error}`);
    }
}

async function updatePackage(packageId: PackageID, packageData: PackageData, packageMetadata: PackageMetadata): Promise<void> {
    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error(`Failed POST request. Error 503`);
        throw new Error('500')
    }
    try {
        logger.debug(`Fetching package with ID: ${packageId}`);
        const [selectResults] = await connection.execute<RowDataPacket[]>(
            `SELECT * FROM ${table} WHERE ID = ?`, [packageId]
        );

        const packageRow = selectResults[0];
        logger.debug(`package Name: ${packageMetadata.Name}`);
        logger.debug(`package ID: ${packageRow.ID.toString()}`);
        if (packageRow.Name === packageMetadata.Name && packageRow.ID.toString() === packageId) {
            let return_data;
            if (packageData.URL) {
                logger.debug(`Downloading repo from URL: ${packageData.URL}`);
                await downloadRepo(packageData.URL, 'rest_api/dump');
            } else {
                logger.debug('Decoding Base64 content and extracting');
                const content: any = packageData.Content;
                await decodeBase64AndExtract(content, 'rest_api/dump');
            }
            logger.debug("Download complete");
            return_data = await ZIP('../dump', packageMetadata.Name, packageMetadata.Version, 'rest_api');
            logger.info(`Updating package in the database with ID: ${packageId}`);
            await connection.execute(
                `UPDATE ${table} SET Content = ?, Version = ?, URL = ?, JSProgram = ? WHERE ID = ?`,
                [return_data.fileContent, packageMetadata.Version, packageData.URL, packageData.JSProgram, packageId]
            );

        } 

        logger.debug('Initiating deletion of ZIP files');
        await deleteAllZipFiles('rest_api');
        logger.info(`Deleting directory: 'rest_api/dump'`);
        await fs.promises.rm('rest_api/dump', { recursive: true });
    } catch (error) {
        logger.error(`404 error: ${error}`);
        throw new Error('404');
    } finally {
        if (connection) {
            logger.debug('Closing database connection');
            await connection.end();
        }
    }
}

router.put('/:id', async (req: Request, res: Response) => {
    const packageId: PackageID = req.params.id;
    const packageData: PackageData = req.body.data;
    const packageMetadata: PackageMetadata = req.body.metadata;

    logger.info(`Received PUT request for package update with ID: ${packageId}`);

    if ((!packageData.URL && !packageData.Content) || !packageId || !packageData || !packageMetadata || !packageData.JSProgram || !packageMetadata.Name || !packageMetadata.Version || !packageMetadata.ID) {
        logger.error('Missing or improperly formed fields in PUT request');
        return res.status(400).json({ error: 'There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.' });
    }

    try {
        let githubUrl = packageData.URL;

        // If the URL is from npmjs, extract the GitHub URL
        if (githubUrl && githubUrl.includes('npmjs.com')) {
            try {
                // Extract the npm package name from the URL
                let packageName = githubUrl.replace('https://www.npmjs.com/package/', '').split('/')[0];
                const npmData = await fetchNpmDataWithAxios(packageName);
                githubUrl = getGithubUrlFromNpmData(npmData) || undefined;
            } catch (error) {
                logger.error('Failed to fetch GitHub URL from NPMJS link: ' + githubUrl);
                return res.status(400).json({ error: 'There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.' });
            }
        }

        // Proceed with the existing logic to handle GitHub URL or Content
        await updatePackage(packageId, { ...packageData, URL: githubUrl }, packageMetadata);
        res.status(200).json({ message: 'Package updated successfully.' });
    } catch (error: any) {
        logger.error(`Error in PUT request for package update: ${error}`);
        if (error.message == '404') {
            res.status(404).json({ error: 'Package does not exist.' });
        } else if (error.message == '400') {
            res.status(400).json({ error: 'There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error.' });
        }
    }
});

export default router;
