const { analyzePackages } = require('./new-metrics');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('analyzePackages', () => {
    it('should return a valid rating for a GitHub link with dependencies', async () => {
        const gitHubLink = 'https://github.com/facebook/react';
        const rating = await analyzePackages(gitHubLink);
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(1);
    });
    
    it('should return a rating of 1 for a GitHub link without dependencies', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/no-dependencies-test-repo';
        const rating = await analyzePackages(gitHubLink);
        expect(rating).toBe(1);
    });

    it('should return a rating of 1 for a GitHub link with all non-constraint dependencies', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/no-dependencies-test-repo';
        const rating = await analyzePackages(gitHubLink);
        expect(rating).toBe(1);
    });

    it('should handle errors and return a rating of 0 if no package.json is found', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase1';
        const rating = await analyzePackages(gitHubLink);
        expect(rating).toBe(0);
    });
    
    it('should handle errors and return a rating of 0 if repo doesnt exist', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase3';
        const rating = await analyzePackages(gitHubLink);
        expect(rating).toBe(0);
    });
});
