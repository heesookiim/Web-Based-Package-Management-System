// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
import post_package from './routes/post_package';
import post_packages from './routes/post_packages';
import * as path from 'path';
import { initializeDatabase } from './db';
import * as bodyParser from 'body-parser';
import { logger } from '../logger_cfg';
import * as http from 'http';

// Load environment variables from .env file
dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json({ limit: '4096mb' }));
app.use(bodyParser.urlencoded({ limit: '4096mb', extended: true }));
app.use(express.json());

// Check the database and initialize it before starting the server
let server: http.Server
initializeDatabase()
    .then(() => {
        logger.info('Starting the server');
        server = app.listen(PORT, () => {
        logger.info('API running on port ' + PORT);
        // console.log('API running on port ' + PORT);
        });
        
        // Setup the routes
        app.use('/package', post_package);
        app.use('/packages', post_packages);
        
        app.get(['/add'], (req, res)=> {
        res.sendFile(path.join(__dirname, '../web', 'add.html'));
        });

        app.get(['/all', '/home', '/'], (req, res)=> {
            res.sendFile(path.join(__dirname, '../web', 'packages.html'));
        });          
    })

export { server, app };