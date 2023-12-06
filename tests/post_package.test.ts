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

describe('/POST package', () => {
    jest.setTimeout(40000);

    it('201 Success.', async () => {
        (connectToDatabase as jest.Mock).mockImplementationOnce(async () => ({
            execute: jest.fn().mockResolvedValueOnce([
                [], []]),
            end: jest.fn(),
        }));

        const res = await request(app)
            .post('/package')
            .send(
                {
                    URL: "https://github.com/WebReflection/flatted",
                    JSProgram: "npm i flatted"
                }
                );

        expect(res.status).toBe(201);
        expect(res.body).toEqual(
            {
                "metadata": {
                    "Name": "flatted",
                    "Version": "3.2.9",
                    "ID": "flatted_3.2.9"
                },
                "data": {
                    "URL": "https://github.com/WebReflection/flatted",
                    "JSProgram": "npm i flatted"
                }
            },
            );
        expect(connectToDatabase).toHaveBeenCalled();
    });

    it('400 There is missing field(s)', async () => {
        (connectToDatabase as jest.Mock).mockImplementationOnce(async () => ({
            execute: jest.fn().mockResolvedValueOnce([
                [], []]),
            end: jest.fn(),
        }));

        const res = await request(app)
            .post('/package')
            .send(
                {
                    URL: "https://github.com/WebReflection/flatted",
                    //                    JSProgram: "npm i flatted"
                }
                );

        expect(res.status).toBe(400);
        expect(res.body).toStrictEqual(
            {
                "error": "There is missing field(s) in the PackageData or it is formed improperly."
            },
            );
    });

    it('409 Package exists already.', async () => {
        (connectToDatabase as jest.Mock).mockImplementationOnce(async () => ({
            execute: jest.fn().mockResolvedValueOnce([
                [{ Name: 'flatted', Version: '3.2.9', ID: 'flatted_3.2.9' }], []]),
            end: jest.fn(),
        }));


        const res = await request(app)
            .post('/package')
            .send(
                {
                    URL: "https://github.com/WebReflection/flatted",
                    JSProgram: "npm i flatted"
                }
                );

        expect(res.status).toBe(409);
        expect(res.body).toBe(
            {
                "error": "Package exists already."
            }
            );
        expect(connectToDatabase).toHaveBeenCalled();
    });


});