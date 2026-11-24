/**
 * LinkPulse Web - IndexedDB Persistence Layer
 * Provides persistent browser storage for analyzed domains, metrics, and top 100 backlinks.
 */

class LinkPulseDB {
  constructor(dbName = 'LinkPulseDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('analyses')) {
          const store = db.createObjectStore('analyses', { keyPath: 'id' });
          store.createIndex('target', 'target', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('domainRating', 'domainRating', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveAnalysis(analysisData) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('analyses', 'readwrite');
      const store = tx.objectStore('analyses');

      // Unique ID based on normalized target + scope
      const id = `${analysisData.target.toLowerCase()}__${analysisData.scope.toLowerCase()}`;
      const record = {
        id,
        target: analysisData.target,
        scope: analysisData.scope,
        domainRating: analysisData.domainRating,
        backlinksCount: analysisData.backlinksCount,
        referringDomains: analysisData.referringDomains,
        dofollowPercent: analysisData.dofollowPercent,
        frequentAnchors: analysisData.frequentAnchors || [],
        backlinks: analysisData.backlinks || [],
        timestamp: analysisData.timestamp || Date.now(),
        updatedAt: new Date().toISOString()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async getAnalysis(target, scope) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('analyses', 'readonly');
      const store = tx.objectStore('analyses');
      const id = `${target.toLowerCase()}__${scope.toLowerCase()}`;
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getHistory(limit = 30) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('analyses', 'readonly');
      const store = tx.objectStore('analyses');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          // Exclude the heavy backlinks array for lightweight history listing
          const { backlinks, ...summary } = cursor.value;
          summary.backlinksCountActual = backlinks ? backlinks.length : 0;
          results.push(summary);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteAnalysis(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('analyses', 'readwrite');
      const store = tx.objectStore('analyses');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('analyses', 'readwrite');
      const store = tx.objectStore('analyses');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
window.linkPulseDB = new LinkPulseDB();
