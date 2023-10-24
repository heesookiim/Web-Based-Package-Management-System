import request from 'supertest';
import { Express } from 'express';
import { getPackageServer } from './get';
import { Package } from './schema';

beforeEach(() => {
    jest.clearAllMocks();
});

// Mock the axios module
jest.mock('axios');

const mockAxios = jest.requireMock('axios');  // This gets the mocked version of axios

describe('GET /package/{id}', () => {
    let app: Express;

    const mockData: Package[] = [
        {
        metadata: {
            ID: '1',
            Name: 'Test Package',
            Version: '1.0.0',
            Description: 'This is a test package',
        },
        data: {
            Content: 'sampleContent',
            URL: 'http://example.com',
            JSProgram: 'console.log("test");',
        },
        },
    ];

    beforeEach(async () => {
        // Set up the mock implementation for axios.get
        mockAxios.get.mockResolvedValue({ data: mockData });

        app = await getPackageServer('mockUrl', 'mockSecretToken');
    });

    afterEach(() => {
        jest.resetAllMocks();
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

    it('should return 400 if unauthorized', async () => {
        const response = await request(app).get('/package/1');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
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
