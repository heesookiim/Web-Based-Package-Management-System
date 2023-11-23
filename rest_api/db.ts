// CREATE DATABASE packages;
import * as mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD
};

// Maybe -- USE ENV FILE INSTEAD 
export const dbName = '461ProjectPhase2';
export const tableName = 'package';

const tableCreationQuery = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' +
    'Name VARCHAR(255), ' +
    'Version VARCHAR(255), ' +
    'ID VARCHAR(255), ' +
    'URL VARCHAR(255), ' +
    'Content LONGTEXT, ' +
    'JSProgram TEXT' +
    ');';

export async function initializeDatabase() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('CREATE DATABASE IF NOT EXISTS ' + dbName);
        await connection.query('USE ' + dbName);
        await connection.query(tableCreationQuery);
        // console.log('Database initialized successfully');
    } catch (error) {
        console.error('Unable to initialize the database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

export async function connectToDatabase() {
    try {
        const connectionWithDB = await mysql.createConnection(dbConfig);
        // console.log('Connected to the database successfully');
        return connectionWithDB;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
}