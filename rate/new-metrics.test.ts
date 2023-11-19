const { analyzePackages, analyzePullRequests } = require('./new-metrics');

beforeEach(() => {
    jest.clearAllMocks();
});

// Test Suite 1
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
        const gitHubLink = 'https://github.com/hall657/461Project-Phase1';
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

// Test Suite 2
describe('analyzePullRequests', () => {
    it('should return the correct ratio when there are reviewed pull requests', async () => {
        const gitHubLink = 'https://github.com/facebook/react';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBeLessThanOrEqual(1);
        expect(pr_review_ratio).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should return 0 when there are no reviewed pull requests', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase1';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    });

    it('should return 0 when no pull requests are found', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/no-dependencies-test-repo';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    });

    it('should handle errors and return 0 when an error occurs', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase3';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    });
});

