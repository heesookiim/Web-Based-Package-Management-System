import { Router, Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from '../db';
import { logger } from '../../logger_cfg';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    logger.info('POST /packages performed');

    let offset = 0;

    try {
        let parsedOffset = parseInt(req.query.offeset as string);

        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
            offset = parsedOffset;
        }
    } catch (error) {
        console.error('Error while parsing offset to SQL:', error);
    }

    const package_queries = req.body as schema.PackageQuery[]; 
    const limit = 10;   // number of data rows per page

    if (!Array.isArray(package_queries) || package_queries.length < 1 || Object.keys(package_queries[0]).length === 0) {
        logger.error("There is missing field(s) in the PackageQuery or it is formed improperly");
        return res.status(400).json( { error: 'There is missing field(s) in the PackageQuery/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.'});
    }

    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error('Failed to connect to the database:', error);
        return res.status(500).json({ error: 'Database connection failed' });
    }    

    try {
        const { Name, Version } = package_queries[0];
        let query = 'SELECT Name, Version, ID ' +
                    'FROM ' + dbName + '.' + tableName + ' ';
        let queryParam: (string | number)[] = [];

        const versionConditions: string[] = [];

        if (Version) {
            logger.info('Retrieving packages that exactly match with the query');
            if (Version.includes('-')) {
                logger.debug('Received version: ' + 'Bounded range');
                const [start, end] = Version.split('-');
                versionConditions.push('Version BETWEEN ? AND ?');
                queryParam.push(start, end);
            } else if (Version.startsWith('^') || Version.startsWith('~')) {
                logger.debug('Received version: ' + 'Caret or Tilde');
                const baseVersion = Version.substring(1);
                const upperBound = calcUpperBound(baseVersion, Version[0]);
                versionConditions.push('Version >= ? AND Version < ?');
                queryParam.push(baseVersion, upperBound);
            } else {
                logger.debug('Received version: ' + 'Exact');
                versionConditions.push('Version = ?');
                queryParam.push(Version);
            }
        }
        if (Name !== '*') {
            versionConditions.push('Name = ?');
            queryParam.push(Name);
        }

        if (versionConditions.length) {
            query += 'WHERE ' + versionConditions.join(' AND ');
        }

        query += ' LIMIT ? OFFSET ?';
        queryParam.push(limit.toString(), offset.toString());

        logger.debug('Sending the following query to database: ' + query);
        logger.debug('Sending the following query parameters to database: ' + queryParam);
        const [results] = await connection.execute(query, queryParam) as [RowDataPacket[], FieldPacket[]];

        const resultsLength = results.length;

        if (( offset != 0 && resultsLength > offset * limit ) || ( offset == 0 && resultsLength > limit )) {
            logger.error('Too many packages returned')
            return res.status(413).json({ error: 'Too many packages returned.'});
        }

        res.setHeader('offset', String(offset));
        res.status(200).json(results);
        logger.info('POST /packages finished successfully');
    } catch (error) {
        logger.error('Query failed', error);
        return res.status(500);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

function calcUpperBound(version: string, type: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
        const [major, minor, patch] = parts.map(Number);
        if (type === '^') {
            return `${major + 1}.0.0`;
        } else if (type === '~') {
            // Include all patch versions within the specified minor version
            return `${major}.${minor + 1}.0`;
        } else {
            logger.error('Invalid version type: ' + type);
        }
    } else {
        logger.error('Invalid version format: ' + version);
    }
    return version; // Return the original version if unable to calculate the upper bound
}

export default router;