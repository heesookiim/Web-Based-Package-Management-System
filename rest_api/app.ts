// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
import post_package from './routes/post_package';
import post_packages from './routes/post_packages';
import delete_reset from './routes/delete_reset';
import get_package_id from './routes/get_package_id';
import get_package_id_rate from './routes/get_package_id_rate';
import delete_package_id from './routes/delete_package_id';
import delete_package_name from './routes/delete_package_name';
import put_package_id from './routes/put_package_id';
import post_package_byregex from './routes/post_package_byregex';
import put_athenticate from './routes/put_authenticate';
import * as path from 'path';
import { initializeDatabase } from './db';
import * as bodyParser from 'body-parser';
import { logger } from '../logger_cfg';
import * as http from 'http';
import * as morgan from 'morgan';

// Load environment variables from .env file
dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json({ limit: '4096mb' }));
app.use(bodyParser.urlencoded({ limit: '4096mb', extended: true }));
app.use(express.json());
app.use(bodyParser.json());

// Check the database and initialize it before starting the server
let server: http.Server
initializeDatabase()
    .then(() => {
        logger.info('Starting the server');
        server = app.listen(PORT, () => {
        logger.info('API running on port ' + PORT);
        // console.log('API running on port ' + PORT);
        });

        // log entire incoming request
        // Define a custom token for morgan to log the entire request object as a string
        //morgan.token('request', (req) => JSON.stringify(req));      
        // Use morgan middleware with the custom format
        app.use(
        morgan((tokens, req, res) => {
            return [
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            '-',
            tokens['response-time'](req, res),
            'ms',
            `'${JSON.stringify(req.headers)}'`,
            `'${JSON.stringify(req.body)}'`,
            ].join(' ');
        })
        );
        
        // Setup the routes, order matters
        // more specific should come before more general
        app.use('/authenticate', put_athenticate);
        app.use('/package', get_package_id_rate);
        app.use('/package', get_package_id);
        app.use('/package', delete_package_id);
        app.use('/package', delete_package_name);
        app.use('/package', post_package_byregex);
        app.use('/package', post_package);
        app.use('/packages', post_packages);
        app.use('/reset', delete_reset);
        app.use('/package', put_package_id);
        
        app.get(['/add'], (req, res)=> {
        res.sendFile(path.join(__dirname, '../web', 'add.html'));
        });

        app.get(['/all', '/home', '/'], (req, res)=> {
            res.sendFile(path.join(__dirname, '../web', 'packages.html'));
        });

        // Add a route for view.html
        app.get(['/view', '/view.html', '/view/*'], (req, res)=> {
            res.sendFile(path.join(__dirname, '../web', 'view.html'));
        });

    })

export { server, app };