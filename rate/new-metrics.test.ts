const { analyzePackages, analyzePullRequests } = require('./new-metrics');

beforeEach(() => {
    jest.clearAllMocks();
});

// Test Suite 1
describe('analyzePackages', () => {
    it('should return a valid rating for a file with dependencies', async () => {
        const rating = await analyzePackages('rate/dump', 'package1.json');
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(1);
    }, 100000);

    it('should return a rating of 1 for a file without dependencies', async () => {
        const rating = await analyzePackages('rate/dump', 'package2.json');
        expect(rating).toBe(1);
        }, 100000);

    it('should return a rating of 1 for a file with all non-constraint dependencies', async () => {
        const rating = await analyzePackages('rate/dump', 'package3.json');
        expect(rating).toBe(1);
        }, 100000);

    it('should handle errors and return a rating of 0 if package.json is empty', async () => {
        const rating = await analyzePackages('rate/dump', 'package4.json');
        expect(rating).toBe(0);
        }, 100000);

    it(`should handle errors and return a rating of 0 if package.json doesn't exist`, async () => {
        const rating = await analyzePackages('rate/dump', 'package5.json');
        expect(rating).toBe(0);
        }, 100000);
});

// Test Suite 2
describe('analyzePullRequests', () => {
    it('should return the correct ratio when there are reviewed pull requests', async () => {
        const gitHubLink = 'https://github.com/facebook/react';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBeLessThanOrEqual(1);
        expect(pr_review_ratio).toBeGreaterThanOrEqual(0);
    }, 600000);

    it('should return 0 when there are no reviewed pull requests', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase1';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    }, 600000);

    it('should return 0 when no pull requests are found', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/no-dependencies-test-repo';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    }, 600000);

    it('should handle errors and return 0 when an error occurs', async () => {
        const gitHubLink = 'https://github.com/bhatnag8/461-project-phase3';
        const pr_review_ratio = await analyzePullRequests(gitHubLink);
        expect(pr_review_ratio).toBe(0);
    }, 600000);
});

