import { supabase, demoModus } from './supabase.js'

// In demomodus blijft alles in het geheugen van de browser.
const demo = { snapshots: [], analyses: [] }

// Alle snapshots ophalen (max ~24 maanden × 9 entiteiten × 2 bronnen is klein).
export async function haalSnapshotsOp() {
  if (demoModus) return [...demo.snapshots]
  const { data, error } = await supabase
    .from('snapshots')
    .select('maand, entiteit, bron, data, updated_at')
    .order('maand', { ascending: true })
  if (error) throw error
  return data
}

// Upsert per (maand, entiteit, bron): opnieuw uploaden overschrijft.
export async function bewaarSnapshots(rijen) {
  if (demoModus) {
    for (const rij of rijen) {
      const i = demo.snapshots.findIndex(
        (s) => s.maand === rij.maand && s.entiteit === rij.entiteit && s.bron === rij.bron
      )
      if (i >= 0) demo.snapshots[i] = rij
      else demo.snapshots.push(rij)
    }
    return
  }
  const { error } = await supabase
    .from('snapshots')
    .upsert(
      rijen.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: 'maand,entiteit,bron' }
    )
  if (error) throw error
}

export async function haalAnalyseOp(maand) {
  if (demoModus) {
    return demo.analyses.filter((a) => a.maand === maand).at(-1) || null
  }
  const { data, error } = await supabase
    .from('analyses')
    .select('maand, inhoud, created_at')
    .eq('maand', maand)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

export async function bewaarAnalyse(maand, inhoud) {
  if (demoModus) {
    demo.analyses.push({ maand, inhoud, created_at: new Date().toISOString() })
    return
  }
  const { error } = await supabase.from('analyses').insert({ maand, inhoud })
  if (error) throw error
}
