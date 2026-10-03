import type { SiteConfig } from '@/blocks/types'

export interface ImportedTemplate { id: string; name: string; config: SiteConfig }

/** IndexedDB holds assets without duplicating large archives in localStorage. */
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sitebuilder-imported-templates', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('templates', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveImportedTemplate(config: SiteConfig, source: string) {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite')
      transaction.objectStore('templates').put({ id: source, name: config.name, config })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } finally { db.close() }
}

export async function importedTemplates(): Promise<ImportedTemplate[]> {
  const db = await database()
  try {
    return await new Promise<ImportedTemplate[]>((resolve, reject) => {
      const request = db.transaction('templates').objectStore('templates').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
