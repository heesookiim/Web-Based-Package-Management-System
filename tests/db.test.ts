// Integration testing for database and REST APIs
// Unit testing and Integration testing for database
import * as mysql from 'mysql2/promise';
import * as db from '../rest_api/db';

jest.mock('mysql2/promise', () => ({
    createConnection: jest.fn(),
}));

afterEach(() => {
    jest.clearAllMocks();
});

// Unit testing for database initialization 
describe('Database Initialization and Connection', () => {
    it('initializes the database successfully', async () => {
        const mockQuery = jest.fn().mockResolvedValue([[], []]);
        const mockEnd = jest.fn();
        (mysql.createConnection as jest.Mock).mockResolvedValue({
            query: mockQuery,
            end: mockEnd,
        });

        await db.initializeDatabase();

        expect(mysql.createConnection).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE DATABASE IF NOT EXISTS'));
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS'));
        expect(mockEnd).toHaveBeenCalled();
    })

    it('handles connection failure in initialization', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const mockError = new Error('Connection faield');
        (mysql.createConnection as jest.Mock).mockRejectedValue(mockError);
        await expect(db.initializeDatabase()).rejects.toThrow(mockError);
        consoleSpy.mockRestore();
    })

    it('fails to create the database', async () => {
        const mockQuery = jest.fn()
            .mockRejectedValueOnce(new Error('Failed to create database'))
            .mockResolvedValue([[], []]);
        const mockEnd = jest.fn();
        
        (mysql.createConnection as jest.Mock).mockResolvedValue({
            query: mockQuery,
            end: mockEnd,
        });

        await expect(db.initializeDatabase()).rejects.toThrow('Failed to create database');
        expect(mockEnd).toHaveBeenCalled;
    })
})