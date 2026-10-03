import { saveImportedTemplate } from '@/lib/imported-library'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileUp, Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  importUploadedSite,
  importUploadedFolder,
  type UploadResult,
  type PathedFile,
} from '@/lib/import-upload'
import { useBusinessStore } from '@/store/businessStore'
import { useConfigStore } from '@/store/configStore'
import { usePublishStore } from '@/store/publishStore'
import { api } from '@/lib/api'

/**
 * Bring a website you already have.
 *
 * Somebody with a finished site — a template they bought, a page a previous
 * developer left them — should be able to open it here and change a phone
 * number, rather than rebuilding it first. What they upload is translated into
 * this builder's own widgets, so every part of it is editable; it is not
 * pasted in as a slab of markup that looks right and cannot be touched.
 *
 * The screen says plainly what was recognised and what was not, because an
 * import is a guess and the owner is the only person who can tell whether the
 * guess was good.
 */

const LABELS: Record<string, string> = {
  page: 'pages, design kept exactly as uploaded',
}

export function UploadSite() {
  const navigate = useNavigate()
  const profile = useBusinessStore((s) => s.profile)
  const setConfig = useConfigStore((s) => s.setConfig)
  const setSite = usePublishStore((s) => s.setSite)
  const clearPublish = usePublishStore((s) => s.clear)

  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragging, setDragging] = useState(false)

  async function read(file: File) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await importUploadedSite(file))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That file could not be read.')
    } finally {
      setBusy(false)
    }
  }

  async function readFolder(files: PathedFile[]) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await importUploadedFolder(files))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That folder could not be read.')
    } finally {
      setBusy(false)
    }
  }

  /** Every file inside a folder input, each tagged with its path in the folder. */
  function fromFolderInput(fileList: FileList): PathedFile[] {
    return Array.from(fileList).map((file) => ({
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      file,
    }))
  }

  /** Walks a dropped folder's entries so its files arrive with their paths intact. */
  async function fromDroppedEntry(entry: FileSystemEntry): Promise<PathedFile[]> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      )
      return [{ path: entry.fullPath.replace(/^\//, ''), file }]
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const children: FileSystemEntry[] = []
      // Chromium returns directory entries in batches (often 100 at a time).
      // Read until exhaustion so a large images folder is not silently cut off.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
        if (!batch.length) break
        children.push(...batch)
      }
      const nested = await Promise.all(children.map(fromDroppedEntry))
      return nested.flat()
    }
    return []
  }

  async function open() {
    if (!result) return
    setBusy(true)
    try {
      // Deliberately not personalised the way a template is. `applyProfile`
      // writes the business name into the hero headline and the logo, which is
      // right for a generic design and wrong here: this site already says what
      // the owner wanted it to say, and overwriting their own headline with
      // their company name is the one thing they would not forgive.
      const config = result.config
      setConfig(config)
      try { await saveImportedTemplate(config, result.sourceFile + ':' + config.name) }
      catch { toast('The website opened, but this browser could not store a library copy.') }
      clearPublish()

      try {
        const created = await api.createSite({
          name: profile.name.trim() || config.name,
          config,
          profile,
        })
        setSite(created.id)
      } catch {
        // Left unsaved on purpose; nothing here should block reaching the editor.
      }

      toast('Your site is open in the editor')
      navigate('/editor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Reached from the home page as well as from the template chooser, so
            the way out is wherever they came from rather than a fixed screen. */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text-0 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-0 font-display">
          Use a site you already have
        </h1>
        <p className="mt-1.5 text-[12.5px] text-text-2 leading-relaxed">
          Upload your website and it opens in the editor, ready to change. Pick the
          whole <strong className="text-text-1">folder</strong> your site lives in — or drop it below —
          and it comes in as-is, pictures included. A <strong className="text-text-1">.zip</strong> of
          the same folder works too, or a single <strong className="text-text-1">.html</strong> page
          on its own.
        </p>

        <label
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)

            // A dropped folder arrives as directory entries, not plain files —
            // walking them keeps each file's path, which is what tells the
            // importer where its pictures sit relative to its page.
            const entry = event.dataTransfer.items[0]?.webkitGetAsEntry?.()
            if (entry?.isDirectory) {
              void fromDroppedEntry(entry).then(readFolder)
              return
            }

            const file = event.dataTransfer.files[0]
            if (file) void read(file)
          }}
          className={`mt-6 block rounded-xl border border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${
            dragging ? 'border-brand bg-brand/5' : 'border-border-default hover:border-border-hover'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.html,.htm"
            className="sr-only"
            aria-label="Your website file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void read(file)
            }}
          />
          {busy ? (
            <Loader2 size={22} className="mx-auto animate-spin text-text-3" />
          ) : (
            <FileUp size={22} className="mx-auto text-text-3" />
          )}
          <p className="mt-3 text-[13px] font-medium text-text-0">
            {busy ? 'Reading your site…' : 'Choose a file, or drop it here'}
          </p>
          <p className="mt-1 text-[11.5px] text-text-3">folder, .zip or .html</p>
        </label>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-border-default" />
          <span className="text-[11.5px] text-text-3">or</span>
          <div className="h-px flex-1 bg-border-default" />
        </div>

        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          disabled={busy}
          className="mt-3 w-full h-10 rounded-lg border border-border-default text-[12.5px] font-medium text-text-1 hover:border-border-hover disabled:opacity-60 transition-colors"
        >
          Choose your website folder
        </button>
        <input
          ref={folderInputRef}
          type="file"
          // Non-standard but supported everywhere that matters (Chrome, Edge,
          // Firefox, Safari) — it turns the picker into a folder picker and
          // hands back every file inside, each carrying webkitRelativePath.
          {...{ webkitdirectory: '', directory: '' }}
          multiple
          className="sr-only"
          aria-label="Your website folder"
          onChange={(event) => {
            const files = event.target.files
            if (files && files.length > 0) void readFolder(fromFolderInput(files))
          }}
        />

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-status-red/30 bg-status-red/5 px-3 py-2.5">
            <TriangleAlert size={14} className="mt-0.5 shrink-0 text-status-red" />
            <p className="text-[12.5px] text-status-red">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-border-default bg-bg-1 p-4">
            <p className="text-[13px] font-semibold text-text-0">
              Read {result.report.sections} page{result.report.sections === 1 ? '' : 's'} from{' '}
              {result.sourceFile}
            </p>

            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {Object.entries(result.report.recognised).map(([kind, count]) => (
                <li
                  key={kind}
                  className="h-6 px-2.5 rounded-full bg-bg-2 border border-border-default text-[11.5px] text-text-1 grid place-items-center"
                >
                  {count} {LABELS[kind] ?? kind}
                </li>
              ))}
            </ul>

            {result.report.missingImages.length > 0 && (
              <p className="mt-3 text-[11.5px] text-status-yellow leading-relaxed">
                {result.report.missingImages.length} picture
                {result.report.missingImages.length === 1 ? '' : 's'} could not be found in what you
                uploaded. Send the whole site folder as a .zip to bring them along, or replace them
                in the editor.
              </p>
            )}

            <p className="mt-3 text-[11.5px] text-text-3 leading-relaxed">
              Your design, layout and styling are kept exactly as they were. Click any text, image
              or button once it opens to change it.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void open()}
                disabled={busy}
                className="h-9 px-4 rounded-lg bg-brand text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                Open in the editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                className="h-9 px-4 rounded-lg border border-border-default text-[12.5px] text-text-1 hover:border-border-hover transition-colors"
              >
                Choose another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
