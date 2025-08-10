import { getAuth, onAuthStateChanged } from "firebase/auth";


export function getCurrentUser() {
    const auth = getAuth(window.fireApp);
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
}