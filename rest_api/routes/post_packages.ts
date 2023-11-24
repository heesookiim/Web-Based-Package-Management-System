import { Router, Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as schema from '../../schema';
import * as db from '../db';
import { version } from 'os';
import { logger } from '../../logger_cfg';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    logger.info('POST /packages performed');

    // Q. INT or STR for offset and limit?
    const offset = parseInt(req.query.offset as string) || 0;
    const package_queries = req.body as schema.PackageQuery[]; 
    const limit = 10;   // number of data rows per page

    if (!Array.isArray(package_queries) || package_queries.length === 0) {
        logger.error("There is missing field(s) in the PackageQuery or it is formed improperly");
        return res.status(400);
    }

    const connection = await db.connectToDatabase();

    const { Name, Version } = package_queries[0];
    let query = 'SELECT Name, Version, ID ' +
                'FROM ' + db.dbName + '.' + db.tableName + ' ';
    let queryParam: string[] = [];

    const versionConditions = [];

    logger.info('Retrieving packages that exactly match with the query');
    if (Version.includes('-')) {
        // Bounded range
        const [start, end] = Version.split('-');
        versionConditions.push('Version BETWEEN ? AND ?');
        queryParam.push(start, end);
    } else if (Version.startsWith('^') || Version.startsWith('~')) {
        // Carat or Tilde
        const baseVersion = Version.substring(1);
        const upperBound = calcUpperBound(baseVersion, Version[0]);
        versionConditions.push('Version >= ? AND Version < ?');
        queryParam.push(baseVersion, upperBound);
    } else {
        // Exact
        versionConditions.push('Version = ?');
        queryParam.push(Version);
    }
    if (Name !== '*') {
        versionConditions.push('Name = ?');
        queryParam.push(Name);
    }

    if (versionConditions.length) {
        query += 'WHERE ' + versionConditions.join(' AND ');
    }

    const [results] = await connection.execute(query, queryParam) as [RowDataPacket[], FieldPacket[]];

    await connection.end();

    const resultsLength = results.length
    if (resultsLength === 0) {
        logger.error('There is no such package in the database');
        return res.status(404).json({ error: 'There is no such package in the database'});
    }

    if (( offset != 0 && resultsLength > offset * limit ) || ( offset == 0 && resultsLength > limit )) {
        logger.error('Too many packages returned')
        return res.status(413).json({ error: 'Too many packages returned'});
    }

    res.setHeader('offset', String(offset));
    res.status(200).json(results);
    logger.info('POST /packages finished successfully');
})

function calcUpperBound(version: string, type: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
        const [major, minor, patch] = parts;
        if (type === '^') {
            return `${Number(major) + 1}.0.0`;
        } 
        else if (type === '~') {
            return `${major}.${Number(minor) + 1}.0`;
        }
        else {
            logger.error('There is no such type');
        }
    }
    return version;
}

export default router;