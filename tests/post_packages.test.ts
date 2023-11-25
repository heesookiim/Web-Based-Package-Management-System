// Unit testing for POST /packages
import * as request from 'supertest';
import { server, app } from '../rest_api/app';
import * as db from '../rest_api/db';
import { logger } from '../logger_cfg';

jest.useFakeTimers();

jest.mock('../rest_api/db', () => ({
    ...jest.requireActual('../rest_api/db'),
    connectToDatabase: jest.fn().mockImplementation(() => {
        const mockExecute = jest.fn().mockResolvedValue([[
            { Name: 'express', Verson: '1.0.0', ID: 'some-id' } // Mocked DB response
        ], []]);
        const mockEnd = jest.fn().mockResolvedValue(null);
        return Promise.resolve({
            execute: mockExecute,
            end: mockEnd
        })
    })
}));

describe('POST /packages route', () => {
    beforeAll(done => {
        done();
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    })

    it('should return 200 and package data when valid query is sent', async () => {
        const response = await request(app)
            .get('/packages')
            .send([{ Name: 'express', Version: '1.0.0' }]);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ Name: 'express', Version: '1.0.0', ID: 'some-id' }]);
        expect(db.connectToDatabase).toHaveBeenCalled();

        const dbMock = require('../rest_api/db');
        expect(dbMock.connectToDatabase).toHaveBeenCalled();

        // Get the mock connection object
        const connection = await dbMock.connectToDatabase();
        expect(connection.execute).toHaveBeenCalledWith(expect.any(String), expect.any(Array));

        // Ensure the connection's end method is called to simulate closing the connection
        expect(connection.end).toHaveBeenCalled();

        await connection.end();
    }, 20000);
})