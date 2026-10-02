TypeScript Types & Naming Guide

1) Directory layout (authoritative)
/types
  /entities        // App-wide domain models (User, Ride, Driver...)
  /api             // request/response shapes coming from/to backend
  index.ts         // re-export public types from entities/ and api/


✅ Single source of truth: All public, reusable types live under /types/**.
❌ Not allowed: Defining API responses or entities anywhere else (feature files, lib, etc.).


# Entities
  types/entities/user.d.ts
  types/entities/ride.d.ts
  
# APIS
  types/api/auth.d.ts
  types/api/orders.d.ts

3) Export policy

# All public types must be re-exported from types/index.ts.

export * from './entities/user';
export * from './entities/ride';
export * from './entities/driver';

export * from './api/auth';
export * from './api/orders';

4) Import policy
import type { User, LoginResponse } from '@/types';


No Hungarian notation (IUser, sName) — avoid.