import request = require('supertest');
import { app, server } from '../rest_api/app';
import { connectToDatabase, initializeDatabase } from '../rest_api/db';
import { logger } from '../logger_cfg';

// Mock the database connection
jest.mock('../rest_api/db', () => ({
    connectToDatabase: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue([[], []]),
        end: jest.fn().mockResolvedValue(null)
    }),
    initializeDatabase: jest.fn().mockResolvedValue(null)
}));

beforeAll(async () => {
await initializeDatabase();
});

afterEach(() => {
jest.clearAllMocks();
});

afterAll(async () => {
await new Promise<void>((resolve, reject) => {
    server.close(err => {
    if (err) {
        reject(err);
        return;
    }
    resolve();
    });
});
});

describe('Interaction with the database', () => {
    it('responds with 500 when database connection fails', async () => {
        // Mock a database connection failure
        (connectToDatabase as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
        
        // Make the request and check the response
        const res = await request(app).post('/packages').send([{Name: 'express', Version: '1.0.0'}]);
        expect(res.status).toBe(500);
        // Optionally check the response body for an error message if your API returns one
    });
    it('responds with 400 when the query is invalid', async () => {
        const invalidPackageQuery = {};
        const res = await request(app)
            .post('/packages')
            .send([invalidPackageQuery]);
        expect(res.status).toBe(400);
    });
    it('responds with 200 when no pacakges match the query', async () =>{
        (connectToDatabase as jest.Mock).mockResolvedValue({
            execute: jest.fn().mockResolvedValue([[], []]),
            end: jest.fn().mockResolvedValue(null),
        });

        const res = await request(app)
            .post('/packages')
            .send([{ Name: 'nonexisitent', Version: '0.0.0' }]);
        
        expect(res.status).toBe(200);
    });
    it('responds with 200 when offset leads to no packages found', async () => {
        const largeOffset = '1000';
        const res = await request(app)
            .post('/packages')
            .query({ offset: largeOffset })
            .send([{ Name: 'anyPackage', Version: '1.0.0' }]);

        expect(res.status).toBe(200);
        //expect(res.body.error).toBe('There is no such package in the database');
    });
    it('responds with 413 when too many packages are returned', async () => {
        const mockPackages = new Array(11).fill({ Name: 'sample', Version: '1.0.0', ID: '1' });
        (connectToDatabase as jest.Mock).mockResolvedValueOnce({
            execute: jest.fn().mockResolvedValue([mockPackages, []]),
            end: jest.fn().mockResolvedValue(null)
        });

        const res = await request(app)
            .post('/packages')
            .send([{ Name: 'anyPackage', Version: '1.0.0' }]);

        expect(res.status).toBe(413);
        expect(res.body.error).toBe('Too many packages returned.');
    });
    it('responds with 200 for a successful query', async () => {
        (connectToDatabase as jest.Mock).mockResolvedValueOnce({
            execute: jest.fn().mockResolvedValue([[{ Name: 'express', Version: '1.0.0', ID: 'express_1.0.0' }], []]),
            end: jest.fn().mockResolvedValue(null)
        });

        const res = await request(app)
            .post('/packages')
            .send([{ Name: 'express', Version: '1.0.0' }]);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ Name: 'express', Version: '1.0.0', ID: 'express_1.0.0' }]);
    });
    it('responds with 500 for an internal server error', async () => {
        (connectToDatabase as jest.Mock).mockRejectedValueOnce(new Error('Internal Server Error'));

        const res = await request(app)
            .post('/packages')
            .send([{ Name: 'express', Version: '1.0.0' }]);

        expect(res.status).toBe(500);
    });
});

describe('Verification of generated SQL query based on different semantic versions', () => {
    const sampleLimit = '10';
    const sampleOffset = '0';
    it('generates correct SQL query for exact version match', async () => {
        const mockExecute = jest.fn().mockResolvedValue([[], []]);
        (connectToDatabase as jest.Mock).mockResolvedValue({
            execute: mockExecute, 
            end: jest.fn() 
        });

        await request(app)
        .post('/packages')
        .send([{ Name: 'express', Version: '1.0.0' }]);
        
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('Version = ?'), ['1.0.0', 'express', sampleLimit, sampleOffset]
        );
    });
    it('generates correct SQL query for caret version match', async () => {
        const mockExecute = jest.fn().mockResolvedValue([[], []]);
        (connectToDatabase as jest.Mock).mockResolvedValue({ 
            execute: mockExecute, 
            end: jest.fn()
        });

        await request(app)
        .post('/packages')
        .send([{ Name: 'lodash', Version: '^4.0.0' }]);
        
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('Version >= ? AND Version < ?'), ['4.0.0', '5.0.0', 'lodash', sampleLimit, sampleOffset]
        );
    });
    it('generates correct SQL query for tilde version match', async () => {
        const mockExecute = jest.fn().mockResolvedValue([[], []]);
        (connectToDatabase as jest.Mock).mockResolvedValue({
            execute: mockExecute, 
            end: jest.fn()
        });

        await request(app)
        .post('/packages')
        .send([{ Name: 'lodash', Version: '~4.17.0' }]);
        
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('Version >= ? AND Version < ?'), ['4.17.0', '4.18.0', 'lodash', sampleLimit, sampleOffset]
        );
    });
    it('generates correct SQL query for bounded region version match', async () => {
        const mockExecute = jest.fn().mockResolvedValue([[], []]);
        (connectToDatabase as jest.Mock).mockResolvedValue({
            execute: mockExecute,
            end: jest.fn()
        });

        await request(app)
        .post('/packages')
        .send([{ Name: 'express', Version: '1.0.0-2.0.0' }]);
        
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('Version BETWEEN ? AND ?'), ['1.0.0', '2.0.0', 'express', sampleLimit, sampleOffset]
        );
    });
});

// describe('Error Handling in POST /packages', () => {
//     it('responds with 500 when a query fails', async () => {
//         (connectToDatabase as jest.Mock).mockResolvedValueOnce({
//             execute: jest.fn().mockRejectedValue(new Error('Query failed')),
//             end: jest.fn().mockResolvedValue(null)
//         });

//         const res = await request(app)
//             .post('/packages')
//             .send([{ Name: 'express', Version: '1.0.0' }]);

//         expect(res.status).toBe(500);
//     });

//     it('logs error for invalid version format', async () => {
//         await request(app)
//             .post('/packages')
//             .send([{ Name: 'lodash', Version: 'invalid-version-format' }]);

//         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid version format'));
//     });

//     it('logs error for invalid version type', async () => {
//         await request(app)
//             .post('/packages')
//             .send([{ Name: 'lodash', Version: 'invalid-version-type' }]);
//         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid version type'));
//     });
// });