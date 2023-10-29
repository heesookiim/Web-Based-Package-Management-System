// schema.ts
export interface PackageMetadata {
    Name: string;
    Version: string;
    ID: string;
  }
  
export interface PackageData {
  Content?: string;
  URL?: string;
  JSProgram?: string;
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
  BusFactor: number | -1;
  Correctness: number | -1;
  RampUp: number | -1;
  ResponsiveMaintainer: number | -1;
  LicenseScore: number | -1;
  GoodPinningPractice: number | -1;
  PullRequest: number | -1;
  NetScore: number | -1;
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