// ════════════════════════════════════════
//  FIREBASE SETUP — firebase-config.js
//  Replace placeholder values with your
//  actual Firebase project credentials.
// ════════════════════════════════════════

// ── 1. Install Firebase ──────────────────
// npm install firebase
// or use CDN in HTML:
// <script type="module" src="firebase-app.js"></script>

// ── 2. Your Firebase Config ──────────────
export const firebaseConfig = {
  apiKey: "AIzaSyD2xtZZ9viQOxjmnYpzQhtjYne5l82FM3Y",
  authDomain: "bluedreamitaly.firebaseapp.com",
  projectId: "bluedreamitaly",
  storageBucket: "bluedreamitaly.firebasestorage.app",
  messagingSenderId: "145879085917",
  appId: "1:145879085917:web:938008da8d22839f7c6eb4",
  measurementId: "G-NX6V7GXSS1"
};
// ── 3. Initialize Firebase ───────────────
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics, logEvent } from 'firebase/analytics';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);


// ════════════════════════════════════════
//  PRODUCTS COLLECTION
// ════════════════════════════════════════

// Add Product
export async function addProduct(productData) {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding product:', e);
    throw e;
  }
}

// Get All Products
export async function getProducts(category = null) {
  try {
    let q = collection(db, 'products');
    if (category) {
      q = query(q, where('category', '==', category), where('inStock', '==', true));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching products:', e);
    return [];
  }
}

// Update Product
export async function updateProduct(productId, updates) {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error updating product:', e);
    throw e;
  }
}

// Delete Product
export async function deleteProduct(productId) {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (e) {
    console.error('Error deleting product:', e);
    throw e;
  }
}

// Upload Product Image
export async function uploadProductImage(file, productId) {
  const imageRef = ref(storage, `products/${productId}/${file.name}`);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
}


// ════════════════════════════════════════
//  ORDERS COLLECTION
// ════════════════════════════════════════

// Create Order
export async function createOrder(orderData) {
  try {
    const orderId = `ORD-${Date.now()}`;
    await addDoc(collection(db, 'orders'), {
      id: orderId,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return orderId;
  } catch (e) {
    console.error('Error creating order:', e);
    throw e;
  }
}

// Get All Orders (Admin)
export async function getOrders() {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching orders:', e);
    return [];
  }
}

// Get Customer Orders
export async function getCustomerOrders(email) {
  try {
    const q = query(collection(db, 'orders'), where('email', '==', email));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching customer orders:', e);
    return [];
  }
}

// Update Order Status
export async function updateOrderStatus(firebaseId, newStatus) {
  try {
    await updateDoc(doc(db, 'orders', firebaseId), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error updating order status:', e);
    throw e;
  }
}


// ════════════════════════════════════════
//  AUTHENTICATION
// ════════════════════════════════════════

// User Login
export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// User Register
export async function registerUser(email, password, name) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await addDoc(collection(db, 'users'), {
    uid: userCred.user.uid,
    email,
    name,
    role: 'customer',
    createdAt: new Date().toISOString()
  });
  return userCred;
}

// Admin check
export async function isAdmin(uid) {
  const q = query(collection(db, 'users'), where('uid', '==', uid), where('role', '==', 'admin'));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Auth State Observer
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Sign Out
export async function logout() {
  await signOut(auth);
}


// ════════════════════════════════════════
//  REVIEWS COLLECTION
// ════════════════════════════════════════

export async function addReview(productId, reviewData) {
  return await addDoc(collection(db, 'reviews'), {
    productId,
    ...reviewData,
    createdAt: new Date().toISOString()
  });
}

export async function getProductReviews(productId) {
  const q = query(collection(db, 'reviews'), where('productId', '==', productId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// ════════════════════════════════════════
//  COUPONS COLLECTION
// ════════════════════════════════════════

export async function validateCoupon(code) {
  const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const coupon = snapshot.docs[0].data();
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) return null;
  return coupon;
}

export async function addCoupon(couponData) {
  return await addDoc(collection(db, 'coupons'), {
    ...couponData,
    active: true,
    usedCount: 0,
    createdAt: new Date().toISOString()
  });
}
