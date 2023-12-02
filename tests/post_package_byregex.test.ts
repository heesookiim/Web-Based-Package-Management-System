import request = require('supertest');
import { app, server } from '../rest_api/app';
import { initializeDatabase, connectToDatabase } from '../rest_api/db';
import { PackageData } from '../schema';

jest.mock('../rest_api/db', () => ({
    initializeDatabase: jest.fn().mockResolvedValue(null),
    connectToDatabase: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue(null),
        end: jest.fn().mockResolvedValue(null),
    }),
}));

beforeAll(async () => {
    await initializeDatabase();
});


afterEach(async () => {
    jest.useRealTimers();
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
});

describe('/POST package/byRegEx', () => {
    it('returns packages for valid regex', async () => {
        (connectToDatabase as jest.Mock).mockResolvedValueOnce({
            execute: jest.fn().mockResolvedValue([[{ Name: 'express', Version: '1.0.0', ID: 'express_1.0.0' }], []]),
            end: jest.fn().mockResolvedValue(null)
        });

        const response = await request(app)
            .post('/package/byRegEx')
            .send({ RegEx: '^express$' }); 

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.any(Array));
        expect(response.body.length).toBeGreaterThan(0);
    });
    it('returns 400 for missing regex field', async () => {
        const response = await request(app)
            .post('/package/byRegEx')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'There is missing field(s) in the PackageRegEx or it is formed improperly'});
    });
    it('returns 500 for database connection failure', async () => {
        const response = await request(app).post('/package/byRegEx').send({ RegEx: '.*' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual(expect.any(Object));
        expect(response.body.error).toContain('Internal Server Error');
    });
    // it('returns 404 for no packages found', async () => {
    //     (connectToDatabase as jest.Mock).mockResolvedValueOnce({
    //         execute: jest.fn().mockResolvedValue([[{ Name: 'express', Version: '1.0.0', ID: 'express_1.0.0' }], []]),
    //         end: jest.fn().mockResolvedValue(null)
    //     });
    //     const response = await request(app)
    //         .post('/package/byRegEx')
    //         .send({ RegEx: 'nonexistentpackage' }); 

    //     expect(response.status).toBe(404);
    //     expect(response.body).toEqual({error: 'No package found under this regex'});
    // });
    it('returns 500 for query execution failure', async () => {
        const response = await request(app).post('/package/byRegEx').send({ RegEx: '^express$' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({error: 'Internal Server Error'});
    });
});