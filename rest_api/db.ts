// CREATE DATABASE packages;
import * as mysql from 'mysql2/promise';
import { logger } from '../logger_cfg';

export const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD
};

// Maybe -- USE ENV FILE INSTEAD 
export const dbName = '461ProjectPhase2';
export const tableName = 'package';

export const tableCreationQuery = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' +
    'Name VARCHAR(255), ' +
    'Version VARCHAR(255), ' +
    'ID VARCHAR(255) PRIMARY KEY, ' +
    'URL TEXT, ' +
    'Content LONGTEXT, ' +
    'JSProgram MEDIUMTEXT, ' +
    'NET_SCORE FLOAT, RAMP_UP_SCORE FLOAT, CORRECTNESS_SCORE FLOAT, BUS_FACTOR_SCORE FLOAT, RESPONSIVE_MAINTAINER_SCORE FLOAT, LICENSE_SCORE INT, ' +
    'PINNED_PRACTICE_SCORE FLOAT, PULL_REQUEST_RATING_SCORE FLOAT' +
    ');';

export async function initializeDatabase() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('CREATE DATABASE IF NOT EXISTS ' + dbName);
        await connection.query('USE ' + dbName);
        await connection.query(tableCreationQuery);
        //await connection.query(`SET GLOBAL max_allowed_packet = 524288000;`);     // set in DB configuration on EC2
    } catch (error) {
        logger.error('Unable to initialize the database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            logger.info('Database ' + dbName + ' initialized successfully');
        }
    }
}

export async function connectToDatabase() {
    try {
        const connectionWithDB = await mysql.createConnection(dbConfig);
        logger.info('Connected to the database successfully');
        return connectionWithDB;
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        return Promise.reject(error);
    }
}