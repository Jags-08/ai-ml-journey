/**
 * NEUROWELL — auth.js
 * Authentication: register, login, session, guard
 */

const Auth = {

  /** Hash password (simple SHA-256 via SubtleCrypto) */
  async hashPassword(pw) {
    const buf = new TextEncoder().encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  },

  /** Register a new user */
  async register(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address');
    if (DB.getUser(email)) throw new Error('Email already registered');

    const hashed = await this.hashPassword(password);
    const user = DB.saveUser(email, {
      name,
      password: hashed,
      createdAt: new Date().toISOString(),
      avatar: name.charAt(0).toUpperCase(),
      settings: { language: 'en', notifications: true, theme: 'dark' }
    });
    DB.setSession(email);
    return user;
  },

  /** Login existing user */
  async login(email, password) {
    if (!email || !password) throw new Error('Email and password required');
    const user = DB.getUser(email);
    if (!user) throw new Error('No account found with that email');
    const hashed = await this.hashPassword(password);
    if (user.password !== hashed) throw new Error('Incorrect password');
    DB.setSession(email);
    return user;
  },

  /** Logout */
  logout() {
    DB.clearSession();
    window.location.href = 'index.html';
  },

  /** Guard: redirect to login if not authenticated */
  guard() {
    const session = DB.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    const user = DB.getUser(session.email);
    if (!user) {
      DB.clearSession();
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  /** Get current user (null if not logged in) */
  current() {
    const session = DB.getSession();
    if (!session) return null;
    return DB.getUser(session.email);
  },

  /** Update profile */
  async updateProfile(email, updates) {
    if (updates.password) {
      updates.password = await this.hashPassword(updates.password);
    }
    return DB.saveUser(email, updates);
  },

  /** Demo login (one-click) */
  async demoLogin() {
    const email = 'demo@neurowell.ai';
    if (!DB.getUser(email)) {
      await this.register('Alex Demo', email, 'demo123');
      // Seed demo data
      this._seedDemoData(email);
    }
    await this.login(email, 'demo123');
  },

  /** Seed demo health data */
  _seedDemoData(email) {
    const symptoms = ['headache','fatigue','stress','anxiety','back pain','nausea'];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const log = {
        date,
        sleep:    +(5 + Math.random() * 4).toFixed(1),
        water:    Math.floor(4 + Math.random() * 6),
        activity: Math.floor(10 + Math.random() * 80),
        stress:   Math.floor(2 + Math.random() * 8),
        mood:     Math.floor(3 + Math.random() * 7),
        symptoms: Math.random() > 0.5
          ? [symptoms[Math.floor(Math.random() * symptoms.length)]]
          : [],
        notes:    ''
      };
      // Override timestamp so it matches the date
      const key = `nw_logs_${email}`;
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      logs.push({ id: Date.now() - i*1000, timestamp: d.toISOString(), ...log });
      localStorage.setItem(key, JSON.stringify(logs.sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp))));
    }
    // Seed alert
    DB.saveAlert(email, {
      level: 'warning',
      title: 'Pattern Detected',
      message: 'Low sleep + fatigue reported for 3 consecutive days → Possible burnout risk',
      emoji: '⚠️'
    });
    DB.saveAlert(email, {
      level: 'info',
      title: 'Weekly Report Ready',
      message: 'Your health summary for last week is available',
      emoji: '📊'
    });
  }
};

window.Auth = Auth;
