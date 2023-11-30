// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
import post_package from './routes/post_package';
import post_packages from './routes/post_packages';
import delete_reset from './routes/delete_reset';
import get_package_id from './routes/get_package_id';
import get_package_id_rate from './routes/get_package_id_rate';
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
        
        // Setup the routes, order matters
        // more specific should come before more general
        app.use('/package/:id/rate', get_package_id_rate);
        app.use('/package/:id', get_package_id);
        app.use('/package', post_package);
        app.use('/packages', post_packages);
        app.use('/reset', delete_reset);
        
        app.get(['/add'], (req, res)=> {
        res.sendFile(path.join(__dirname, '../web', 'add.html'));
        });

        app.get(['/all', '/home', '/'], (req, res)=> {
            res.sendFile(path.join(__dirname, '../web', 'packages.html'));
        });          
    })

export { server, app };