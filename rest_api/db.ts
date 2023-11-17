// CREATE DATABASE packages;
import * as mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
};

export async function connectToDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig); // Use mysql.createConnection
        // console.log('Connected to the database successfully!');
        return connection;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
}