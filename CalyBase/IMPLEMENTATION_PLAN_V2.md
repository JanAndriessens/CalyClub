# Implementation Plan: Login, Security, and User Rights (Version 2)

## Overview
This document outlines the step-by-step implementation plan for adding authentication, security, and user rights to the CalyClub application, incorporating best practices and modern Firebase security features.

## Phase 1: Basic Authentication Setup (Week 1)

### 1. Set up Firebase Authentication
```javascript
// 1.1 Create authentication configuration using modular imports
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  // Your Firebase config
};

// 1.2 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

### 2. Create Login/Register Pages
- Create `login.html` and `register.html`
- Implement form validation
- Add password strength requirements
- Implement email verification
- Add reCAPTCHA v3 integration

### 3. Implement Basic Authentication Functions
```javascript
// 3.1 Login function with email verification check
async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.emailVerified) {
      await auth.signOut();
      throw new Error("Please verify your email before logging in.");
    }
    
    return user;
  } catch (error) {
    throw error;
  }
}

// 3.2 Register function with email verification
async function register(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await userCredential.user.sendEmailVerification();
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}
```

## Phase 2: Security Implementation (Week 2)

### 1. Set up Security Middleware
```javascript
// 1.1 Create security middleware
const securityMiddleware = {
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }),
  helmet: helmet(),
  cors: cors(corsOptions)
};

// 1.2 Token refresh handling
auth.onIdTokenChanged((user) => {
  if (user) {
    user.getIdTokenResult(true); // Refresh claims
  }
});
```

### 2. Implement Security Features
- Implement MFA for admin roles
- Add reCAPTCHA v3 for registration and login
- Set up account lockout after failed attempts
- Implement password reset functionality

### 3. Analytics Integration
```javascript
// 3.1 Security event logging
const logSecurityEvent = async (event) => {
  await analytics.logEvent('security_event', {
    event_type: event.type,
    user_id: event.userId,
    timestamp: new Date().toISOString()
  });
};
```

## Phase 3: User Rights System (Week 3)

### 1. Implement Custom Claims
```javascript
// 1.1 Set user role using custom claims
const setUserRole = async (uid, role) => {
  await admin.auth().setCustomUserClaims(uid, { 
    role: role,
    permissions: getRolePermissions(role)
  });
};

// 1.2 Get user permissions from claims
const getUserPermissions = async (user) => {
  const token = await user.getIdTokenResult();
  return token.claims.permissions || [];
};
```

### 2. Implement Permission System
```javascript
// 2.1 Create permissions middleware using custom claims
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const user = await admin.auth().getUser(req.user.uid);
    const token = await user.getIdTokenResult();
    
    if (!token.claims.permissions?.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};
```

### 3. Set up User Profile Structure
```javascript
// 3.1 User profile schema (without role/permissions - handled by custom claims)
const userProfile = {
  uid: string,
  email: string,
  displayName: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  status: "active" | "suspended" | "banned"
};
```

## Phase 4: Database Security Rules (Week 4)

### 1. Update Firestore Rules
```javascript
// 1.1 Implement security rules with custom claims
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             request.auth.token.role == role;
    }
    
    function hasPermission(permission) {
      return isAuthenticated() && 
             request.auth.token.permissions[permission] == true;
    }
    
    // Collection rules
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('admin') || request.auth.uid == userId;
    }
    
    // Catch-all rule
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2. Implement Storage Rules
```javascript
// 2.1 Storage security rules with custom claims
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                  && request.resource.size < 5 * 1024 * 1024
                  && request.resource.contentType.matches('image/.*')
                  && (hasRole('admin') || request.auth.uid == userId);
    }
  }
}
```

## Phase 5: Frontend Implementation (Week 5)

### 1. Create Authentication Components
```javascript
// 1.1 Login component with loading state
class LoginComponent {
  state = {
    loading: true,
    error: null
  };

  async handleLogin(email, password) {
    try {
      this.setState({ loading: true });
      const user = await login(email, password);
      this.redirectToDashboard();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setState({ loading: false });
    }
  }
}
```

### 2. Implement Permission-Based UI
```javascript
// 2.1 Permission gate component with loading state
const PermissionGate = ({ permission, children }) => {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return hasPermission(permission) ? children : null;
};

// 2.2 Centralized auth context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setUser({ ...user, permissions: token.claims.permissions });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 3. Add User Management Interface
- Create user profile page
- Add role management interface (admin only)
- Implement permission management
- Add MFA setup interface

## Phase 6: Testing and Security Audit (Week 6)

### 1. Implement Security Tests
```javascript
// 1.1 Security test suite using Firebase Emulator
describe('Security Tests', () => {
  beforeAll(async () => {
    await connectFirestoreEmulator(db, 'localhost', 8080);
    await connectAuthEmulator(auth, 'http://localhost:9099');
  });
  
  test('should prevent unauthorized access', async () => {
    // Test implementation
  });
  
  test('should enforce role-based access', async () => {
    // Test implementation
  });
});
```

### 2. Perform Security Audit
- Use Firebase Emulator Suite for rule testing
- Run OWASP ZAP for penetration testing
- Use Lighthouse CI for automated audits
- Test token expiration handling
- Verify role change logging

### 3. Implement Monitoring
```javascript
// 3.1 Security monitoring with analytics
const securityMonitoring = {
  logSecurityEvent: async (event) => {
    await analytics.logEvent('security_event', {
      event_type: event.type,
      user_id: event.userId,
      timestamp: new Date().toISOString()
    });
  },
  monitorFailedAttempts: async () => {
    // Monitor failed login attempts
  }
};
```

## Required Dependencies
```json
{
  "dependencies": {
    "firebase": "^10.14.1",
    "firebase-admin": "^13.4.0",
    "express-rate-limit": "^6.7.0",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.0",
    "cors": "^2.8.5",
    "firebase-functions-test": "^3.1.0",
    "jest": "^29.0.0"
  }
}
```

## Implementation Timeline

### Week 1:
- Set up Firebase Authentication with modular imports
- Create basic login/register pages with reCAPTCHA
- Implement email verification

### Week 2:
- Implement security middleware
- Set up MFA for admin roles
- Configure analytics for security events

### Week 3:
- Implement custom claims for roles
- Set up permission system
- Configure user profiles

### Week 4:
- Update Firestore rules with custom claims
- Implement storage rules
- Set up security policies

### Week 5:
- Create authentication components with loading states
- Implement permission-based UI
- Add user management interface

### Week 6:
- Set up Firebase Emulator for testing
- Perform security audit
- Implement monitoring

## Notes
- Use Firebase custom claims instead of storing roles in Firestore
- Implement MFA for high-privilege accounts
- Use reCAPTCHA v3 for bot protection
- Monitor security events with Firebase Analytics
- Test thoroughly using Firebase Emulator Suite
- Keep documentation updated as features are implemented 