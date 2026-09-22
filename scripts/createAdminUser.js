const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdminUser() {
  try {
    const email = 'admin@example.com';
    const password = 'password123';
    const name = 'Super Admin';
    const businessId = 'demo-business-001';

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });

    console.log('User created:', userRecord.uid);

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      name: name,
      role: 'admin',
      businessId: businessId,
      phone: '0712345678',
      status: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('User document created in Firestore');

    // Create business document
    await db.collection('businesses').doc(businessId).set({
      id: businessId,
      name: 'Demo Business',
      ownerName: 'Super Admin',
      phone: '0712345678',
      email: email,
      address: 'Nairobi, Kenya',
      currency: 'KES',
      taxRate: 16.0,
      taxIncluded: false,
      receiptFooter: 'Thank you for shopping with us!',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Business document created');

    // Create business stats
    await db.collection('businessStats').doc(businessId).set({
      totalSales: 0,
      totalRevenue: 0,
      totalProducts: 0,
      totalCustomers: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Business stats created');
    console.log('✅ Setup complete! You can now login with:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdminUser();