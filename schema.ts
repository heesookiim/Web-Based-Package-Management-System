// schema.ts
export interface PackageMetadata {
    Name: PackageName;
    Version: string;
    ID: PackageID;
  }
  
export interface PackageData {
  Content?: string;
  URL?: string;
  JSProgram: string;
}

export interface Package {
  metadata: PackageMetadata;
  data: PackageData;
}  

export interface User {
  name: string;
  isAdmin: boolean;
}

export interface UserAuthenticationInfo {
  password: string;
}

export type PackageID = string;

export interface PackageRating {
  BusFactor: number | 0;
  Correctness: number | 0;
  RampUp: number | 0;
  ResponsiveMaintainer: number | 0;
  LicenseScore: number | 0;
  GoodPinningPractice: number | 0;
  PullRequest: number | 0;
  NetScore: number | 0;
}

export interface PackageHistoryEntry {
  User: User;
  Date: string;
  PackageMetadata: PackageMetadata;
  Action: string;
}

export type PackageName = string;

export type AuthenticationToken = string;

export interface AuthenticationRequest {
  User: User;
  Secret: UserAuthenticationInfo;
}

export type SemverRange = string;

export interface PackageQuery {
  Version: SemverRange;
  Name: PackageName;
}

export type EnumerateOffset = string;

export interface PackageRegEx {
  RegEx: string;
}
