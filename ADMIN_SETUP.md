# Setting Up Admin User in Firebase

## Steps to Add Admin Role to Your Firebase User

### Option 1: Using Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `onsi-de85f`

2. **Navigate to Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Go to the "Data" tab

3. **Find Your User Document**
   - Look for the `users` collection
   - Find the document with your user ID (the document ID should match your Firebase Auth UID)
   - If you don't see your user document, sign in to your website first to create it

4. **Add Admin Role**
   - Click on your user document to edit it
   - Add a new field:
     - Field name: `role`
     - Type: `string`
     - Value: `admin`

5. **Save Changes**
   - Click "Update" to save the changes

### Option 2: Using Firebase Admin SDK (For Developers)

If you have a backend service, you can use the Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');

// Initialize admin SDK
const db = admin.firestore();

// Set admin role for a user
async function setAdminRole(uid) {
  try {
    await db.collection('users').doc(uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Admin role set successfully');
  } catch (error) {
    console.error('Error setting admin role:', error);
  }
}

// Usage
setAdminRole('YOUR_USER_UID_HERE');
```

### Option 3: Manual Database Update

1. **Get Your User UID**
   - Sign in to your website
   - Open browser developer tools (F12)
   - Go to Console tab
   - Type: `window.firebaseAuth.getCurrentUser().uid`
   - Copy the UID string

2. **Update Firestore Document**
   - Go to Firebase Console → Firestore Database
   - Navigate to: `users` → `[YOUR_UID]`
   - Add the admin fields as described in Option 1

## Verification

After setting up the admin role:

1. **Sign out and sign in again** to your website
2. **Check the user profile dropdown** - you should see "Admin Panel" option
3. **Click "Admin Panel"** to access the admin interface
4. If you don't see the option, check the browser console for any errors

## User Document Structure

Your user document should look like this:

```json
{
  "fullName": "Your Name",
  "email": "onsmaitii@gmail.com",
  "role": "admin",
  "createdAt": "2024-10-13T...",
  "orders": []
}
```

## Troubleshooting

### Issue: Admin Panel Link Not Showing
- **Solution**: Check that your user document exists in Firestore
- **Solution**: Verify the `role` field is set to `admin`
- **Solution**: Sign out and sign in again to refresh the authentication state

### Issue: Access Denied When Opening Admin Panel
- **Solution**: Check that the user document has the `role` field set to `admin`
- **Solution**: Verify you're signed in with the correct user account

### Issue: Firebase Permission Errors
- **Solution**: Check your Firestore security rules allow reading user documents
- **Solution**: Ensure the user is authenticated before accessing the admin panel

## Security Considerations

1. **Firestore Rules**: Make sure your security rules allow users to read their own document:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

2. **Admin Verification**: The system checks the `role` field in Firestore to verify admin access

3. **Regular Security Audits**: Periodically review who has admin access in your Firestore database

## Next Steps

Once you've set up your admin user:

1. Test the admin login flow
2. Explore the admin panel features
3. Add more admin users as needed
4. Consider implementing more granular role-based permissions

---

**Need Help?**
If you encounter any issues, check the browser console for error messages or contact your development team.