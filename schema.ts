// schema.ts
export interface PackageMetadata {
    Description?: string; // OPTIONAL: Description of the package
    Name: string;  // Name of a package.
    Version: string;  // Package version. Example: "1.2.3"
    ID: string;  // Internal identifier for interacting with existing packages.
  }
  
export interface PackageData {
  Description?: string; // OPTIONAL: Description of the package
  Content?: string;  // Package contents (Encoded as text using a Base64 encoding). This is the zip file uploaded by the user.
  URL?: string;  // Package URL (for use in public ingest).
  JSProgram?: string;  // A JavaScript program (for use with sensitive modules).
}

export interface PackageRating {
  BusFactor: number;
  Correctness: number;
  RampUp: number;
  ResponsiveMaintainer: number;
  LicenseScore: number;
  GoodPinningPractice: number;
  PullRequest: number;
  NetScore: number;
}
  
export interface Package {
  metadata: PackageMetadata;
  data: PackageData;
}  