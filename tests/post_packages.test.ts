import request = require('supertest');
import { app, server } from '../rest_api/app';
import { initializeDatabase, connectToDatabase } from '../rest_api/db';
import { PackageQuery } from '../schema';

// Mock the database connection
// jest.mock('../rest_api/db', () => ({
//     initializeDatabase: jest.fn().mockResolvedValue(null),
//     connectToDatabase: jest.fn().mockResolvedValue({
//         execute: jest.fn().mockResolvedValue([
//         [{ Name: 'express', Version: '1.0.0', ID: '1' }], // Mock result of the query
//         ]),
//         end: jest.fn().mockResolvedValue(null),
//     }),
// }));
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
  
describe('/POST packages', () => {
    jest.setTimeout(20000);
    const validPackageQuery: PackageQuery = { Name: 'express', Version: '1.0.0' };
    it('should retrieve packages successfully', async () => {
        (connectToDatabase as jest.Mock).mockImplementationOnce(async () => ({
            execute: jest.fn().mockResolvedValueOnce([
                [{ Name: 'express', Version: '1.0.0', ID: '1' }], []]),
            end: jest.fn(),
            }));
        
          
        const res = await request(app)
            .post('/packages')
            .send([validPackageQuery]);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { Name: 'express', Version: '1.0.0', ID: '1' },
        ]);
        expect(connectToDatabase).toHaveBeenCalled();
    });

    it('responds with 500 when database connection fails', async () => {
        // Mock a database connection failure
        (connectToDatabase as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
        
        // Make the request and check the response
        const res = await request(app).post('/packages').send([validPackageQuery]);
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

    it('responds with 404 when no pacakges match the query', async () =>{
        (connectToDatabase as jest.Mock).mockResolvedValue({
            execute: jest.fn().mockResolvedValue([[], []]),
            end: jest.fn().mockResolvedValue(null),
        });

        const res = await request(app)
            .post('/packages')
            .send([{ Name: 'nonexisitent', Version: '0.0.0' }]);
        
        expect(res.status).toBe(404);
    })
      
    it('responds with 200 and data for multiple valid queries', async () => {
        (connectToDatabase as jest.Mock).mockResolvedValueOnce({
          execute: jest.fn().mockResolvedValue([
            [{ Name: 'express', Version: '1.0.0', ID: '1' }, { Name: 'lodash', Version: '4.17.20', ID: '2' }],
            [],
          ]),
          end: jest.fn().mockResolvedValue(null),
        });
      
        const res = await request(app)
          .post('/packages')
          .send([{ Name: 'express', Version: '1.0.0' }, { Name: 'lodash', Version: '4.17.20' }]);
      
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
      });
      
});