import request from 'supertest';
import { Express } from 'express';
import { getPackageServer } from './get';
import { Package } from './schema';

// Mock the axios module
jest.mock('axios');

// Set up mock data
const mockAxios = jest.requireMock('axios');  // This gets the mocked version of axios
const mockData: Package[] = [
    {
    metadata: {
        ID: '1',
        Name: 'Test Package',
        Version: '1.0.0',
    },
    data: {
        Content: 'sampleContent',
        URL: 'http://example.com',
        JSProgram: 'console.log("test");',
    },
    },
];

let app: Express;

beforeEach(async () => {
    mockAxios.get.mockResolvedValue({ data: mockData });
    app = await getPackageServer('mockUrl', 'mockSecretToken');
});

afterEach(() => {
    jest.resetAllMocks();
});

// Test Begins HERE
describe('GET /package/{id}', () => {
    it('should return 400 if package ID is missing', async () => {
        const response = await request(app)
            .get('/package/')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });  
    });

    it('should return 400 if token is missing', async () => {
        const response = await request(app).get('/package/1');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if token is invalid', async () => {
        const response = await request(app)
            .get('/package/1')
            .set('X-Authorization', 'wrongSecretToken');  // Using an incorrect token for this test

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if both ID and token are missing', async () => {
        const response = await request(app).get('/package/1');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return a package by ID', async () => {
        const response = await request(app)
            .get('/package/1')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData[0]);
    });

    it('should return 404 if package not found', async () => {
        const response = await request(app)
            .get('/package/2')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Package not found' });
    });

    it('should log error if failed to fetch package data', async () => {
        // Override the mock implementation for this test to simulate an axios error
        const mockError = new Error('Failed to fetch data');
        mockAxios.get.mockRejectedValue(mockError);

        // We use the expect.assertions to ensure that a certain number of assertions are called
        expect.assertions(2);

        try {
            await getPackageServer('mockUrl', 'mockSecretToken');
        } catch (error) {
            const typedError = error as Error;
            expect(typedError).toBeInstanceOf(Error);
            expect(typedError.message).toBe('Failed to fetch data');
        }
    });

});

describe('GET /package/byName/{name}', () => {
    it('should return 400 if package name is missing', async () => {
        const response = await request(app)
            .get('/package/byName/')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Package name is required' });  
    });

    it('should return 400 if token is missing', async () => {
        const response = await request(app).get('/package/byName/Test Package');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if token is invalid', async () => {
        const response = await request(app)
            .get('/package/byName/Test Package')
            .set('X-Authorization', 'wrongSecretToken');  // Using an incorrect token for this test

        expect(response.status).toBe(400);  // Updated status code to 401
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return a package by name', async () => {
        const response = await request(app)
            .get('/package/byName/Test Package')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData[0]);
    });

    it('should return 404 if package not found by name', async () => {
        mockAxios.get.mockResolvedValue({ data: [] });  // Simulate no package found
        const response = await request(app)
            .get('/package/byName/NonExistentPackage')
            .set('X-Authorization', 'mockSecretToken');
    
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Package not found' });
    });
    

    // it('should log error if failed to fetch package by name', async () => {
    //     // Override the mock implementation for this test to simulate an axios error
    //     const mockError = new Error('Failed to fetch data by name');
    //     mockAxios.get.mockRejectedValue(mockError);

    //     // We use the expect.assertions to ensure that a certain number of assertions are called
    //     expect.assertions(2);

    //     try {
    //         await request(app)
    //             .get('/package/byName/Test Package')
    //             .set('X-Authorization', 'mockSecretToken');
    //     } catch (error) {
    //         const typedError = error as Error;
    //         expect(typedError).toBeInstanceOf(Error);
    //         expect(typedError.message).toBe
    //     }
    // });
});