// CREATE DATABASE packages;
// CREATE USER 'bhatnag8'@'localhost' IDENTIFIED BY '*********';
// GRANT ALL PRIVILEGES ON packages.* TO 'bhatnag8'@'localhost';

import * as mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
};

export async function connectToDatabase() {
    const connection = await mysql.createConnection(dbConfig); // Use mysql.createConnection
    return connection;
}




