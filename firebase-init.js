/**
 * Hiri Surf School - Shared Firebase Initialization Module
 * Provides unified, fast, direct Firebase Firestore & Auth connection
 */

(function() {
    'use strict';

    // Official Production Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAgWoQ_46LrTSbMXc-P25otiPUrR7TuRy0",
        authDomain: "surfing-7d050.firebaseapp.com",
        projectId: "surfing-7d050",
        storageBucket: "surfing-7d050.firebasestorage.app",
        messagingSenderId: "927769828599",
        appId: "1:927769828599:web:0cbc12d587994056db87f2",
        measurementId: "G-HDRHYRTQ84"
    };

    window.firebaseConfig = firebaseConfig;

    if (typeof window.firebase !== 'undefined') {
        try {
            if (!window.firebase.apps || window.firebase.apps.length === 0) {
                window.firebaseApp = window.firebase.initializeApp(firebaseConfig);
            } else {
                window.firebaseApp = window.firebase.app();
            }

            if (typeof window.firebase.auth === 'function') {
                window.auth = window.firebase.auth();
                window.auth.onAuthStateChanged(user => {
                    if (!user) {
                        window.auth.signInAnonymously().catch(() => {});
                    }
                });
            }

            if (typeof window.firebase.firestore === 'function') {
                window.db = window.firebase.firestore();
                // Disable offline persistence to prevent browser multi-tab lock hangs
            }

            console.log("⚡ Firebase ready: surfing-7d050");
        } catch (err) {
            console.error("Firebase init error:", err);
        }
    }
})();
