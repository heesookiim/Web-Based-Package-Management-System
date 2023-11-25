// Integration testing for database and REST APIs
// Unit testing and Integration testing for database
import * as mysql from 'mysql2/promise';
import * as db from '../rest_api/db';

jest.mock('mysql2/promise', () => ({
    createConnection: jest.fn(),
}));

afterEach(() => {
    jest.resetAllMocks();
});

// Unit testing for database initialization 
describe('Database Initialization', () => {
    it('initializes the database successfully', async () => {
        const mockQuery = jest.fn().mockResolvedValue([[], []]);
        const mockEnd = jest.fn();
        (mysql.createConnection as jest.Mock).mockResolvedValue({
            query: mockQuery,
            end: mockEnd,
        });

        await db.initializeDatabase();

        expect(mysql.createConnection).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE DATABASE IF NOT EXISTS 461ProjectPhase2'));
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('USE 461ProjectPhase2'));
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS package (Name VARCHAR(255), Version VARCHAR(255), ID INT AUTO_INCREMENT PRIMARY KEY, URL TEXT, Content LONGTEXT, JSProgram MEDIUMTEXT, NET_SCORE FLOAT, RAMP_UP_SCORE FLOAT, CORRECTNESS_SCORE FLOAT, BUS_FACTOR_SCORE FLOAT, RESPONSIVE_MAINTAINER_SCORE FLOAT, LICENSE_SCORE INT, PINNED_PRACTICE_SCORE FLOAT, PULL_REQUEST_RATING_SCORE FLOAT);'));
        expect(mockEnd).toHaveBeenCalled();
    });

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
        await expect(mockEnd).toHaveBeenCalled;
    });

    it('fails to set the active database', async () => {
        const mockEnd = jest.fn();
        const mockQuery = jest.fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Failed to set active database'));

        (mysql.createConnection as jest.Mock).mockResolvedValue({
            query: mockQuery,
            end: mockEnd,
        });

        await expect(db.initializeDatabase()).rejects.toThrow('Failed to set active database');
        await expect(mockEnd).toHaveBeenCalled();
    });

    it('fails to create the table', async () => {
        const mockEnd = jest.fn();
        const mockQuery = jest.fn()
            .mockResolvedValueOnce(undefined) // Create database succeeds
            .mockResolvedValueOnce(undefined) // Set active database succeeds
            .mockRejectedValueOnce(new Error('Failed to create table')); // Create table fails

        (mysql.createConnection as jest.Mock).mockResolvedValue({
            query: mockQuery,
            end: mockEnd,
        });

        await expect(db.initializeDatabase()).rejects.toThrow('Failed to create table');
        await expect(mockEnd).toHaveBeenCalled();
    });
})

describe('Database Connection', () => {
    it('handles connection failure in initialization', async () => {
        const mockError = new Error('Connection faield');
        (mysql.createConnection as jest.Mock).mockRejectedValue(mockError);
        await expect(db.initializeDatabase()).rejects.toThrow(mockError);
    });

    it('connects to the database successfully', async () => {
        const mockExecute = jest.fn().mockResolvedValue([[], []]);
        (mysql.createConnection as jest.Mock).mockResolvedValue({
            execute: mockExecute,
            end: jest.fn()
        });

        const connection = await db.connectToDatabase();
        await expect(connection).toBeDefined();
        await expect(mysql.createConnection).toHaveBeenCalledWith(db.dbConfig);
    });

    it('should log an error and throw when connection fails', async () => {
        const mockError = new Error('Connection failed');
        (mysql.createConnection as jest.Mock).mockRejectedValue(mockError);
    
        await expect(db.connectToDatabase()).rejects.toThrow('Connection failed');
      });
})