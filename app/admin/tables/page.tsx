"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Loader2, QrCode } from "lucide-react"
import { notify } from '@/lib/notifications/facade'
import { SectionHeader } from '@/components/admin/section-header'
import QRCode from "qrcode"
import { TableCard } from './components/table-card'
import { TableDialog } from './components/table-dialog'
import { SaveConfirmDialog } from './components/save-confirm-dialog'
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminTablesTexts } from "@/lib/i18n/admin-tables"

interface Table {
  id: number
  table_number: number
  qr_code: string
  created_at: string
  updated_at: string
}

export default function TablesAdminPage() {
  const language = useAdminLanguage()
  const [tables, setTables] = useState<Table[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [tableNumberInput, setTableNumberInput] = useState("")
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // local UI states for guards
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // save confirmation
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'add' | 'edit' | null>(null)

  // Get localized text
  const L = getAdminTablesTexts(language)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Error message extractor (placed early)

  // QR generator (placed before fetchTables to avoid TDZ)
  const generateQRCode = async (tableId: string, url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
      setQrCodes(prev => ({ ...prev, [tableId]: qrCodeDataUrl }))
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { cache: 'no-store' })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed')
      }
      const list: Table[] = json.data || []
      setTables(list)
      list.forEach(tbl => generateQRCode(String(tbl.id), tbl.qr_code))
    } catch (error: unknown) {
      console.error('Error fetching tables:', error)
      const msg = getErrMsg(error)
      console.log('Admin: Error fetching tables', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    fetchTables()
  }, [mounted, fetchTables])

  if (!mounted) {
    return null
  }


  const performAddTable = async (num: number) => {
    if (!Number.isInteger(num) || num < 1) {
      console.log('Admin: Invalid table number entered')
      setErrorMessage(L.invalidNumber)
      return
    }
    try {
      setAdding(true)
      setErrorMessage(null)
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: num })
      })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error adding table', json.error)
        if (json.error === 'TABLE_NUMBER_EXISTS') {
          setErrorMessage(L.invalidNumber)
        } else {
          setErrorMessage(L.operationFailed)
        }
        return
      }
      setTableNumberInput('')
      setIsDialogOpen(false)
      await fetchTables()
      console.log('Admin: Table added successfully')
  notify({ type:'tables.create.success' })
    } catch (error: unknown) {
      console.error('Error adding table:', error)
      console.log('Admin: Error adding table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally {
      setAdding(false)
    }
  }
  const performEditTable = async (num: number) => {
    try {
      setEditing(true)
      setErrorMessage(null)
      if (!editingTable) return
      const res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: num })
      })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error editing table', json.error)
        if (json.error === 'TABLE_NUMBER_EXISTS') {
          setErrorMessage(L.invalidNumber)
        } else {
          setErrorMessage(L.operationFailed)
        }
        return
      }
      setEditingTable(null)
      setTableNumberInput('')
      setIsDialogOpen(false)
      await fetchTables()
  notify({ type:'tables.update.success' })
    } catch (error: unknown) {
      console.error('Error updating table:', error)
      console.log('Admin: Error updating table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally { setEditing(false) }
  }

  // removed unused handleSave helper (lint cleanup); confirmation handled inline in dialog callbacks

  const handleDeleteTable = async (tableId: number) => {
    if (deletingId) return
    try {
      setDeletingId(tableId)
  setErrorMessage(null)
      const res = await fetch(`/api/tables/${tableId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error deleting table', json.error)
        setErrorMessage(L.operationFailed)
        return
      }
      await fetchTables()
      console.log('Admin: Table deleted successfully')
  notify({ type:'tables.delete.success' })
    } catch (error: unknown) {
      console.error('Error deleting table:', error)
      console.log('Admin: Error deleting table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally {
      setDeletingId(null)
    }
  }

  function getErrMsg(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) {
      const m = (e as { message?: unknown }).message
      if (typeof m === 'string') return m
    }
    return 'Error'
  }

  const downloadQRCode = (table: Table) => {
    const qrCodeDataUrl = qrCodes[String(table.id)]
    if (!qrCodeDataUrl) return

    const link = document.createElement("a")
    link.download = `table-${table.table_number}-qr.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  const openEditDialog = (table: Table) => {
    if (adding || editing) return
    setEditingTable(table)
    setTableNumberInput(String(table.table_number))
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
          <AdminHeader title={L.title} />
          <main className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-slate-500 text-lg">{L.loading}</p>
            </div>
          </main>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader title={L.title} />
        
        <div className="p-4 pb-20 space-y-6">
          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            <SectionHeader
              title={L.manageTables}
              subtitle={L.description}
              actions={
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    onClick={()=>{ if(refreshing) return; setRefreshing(true); fetchTables().finally(()=>{ setRefreshing(false); notify({ type:'tables.refresh.success' }) }) }}
                    className="border-slate-200 hover:bg-slate-50"
                  >
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">{L.refresh}</span>
                  </Button>
                  <Button
                    size="sm"
                    disabled={adding || editing}
                    onClick={()=>{ setEditingTable(null); setTableNumberInput(''); setIsDialogOpen(true) }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-2">{L.addTable}</span>
                  </Button>
                </div>
              }
            />
          </div>

          {/* Tables Grid */}
          {tables.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full mx-auto flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{L.noTables}</h3>
                <p className="text-slate-500 mb-4">{L.addFirstTable}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table, index) => (
                <TableCard
                  key={table.id}
                  table={{ id: table.id, table_number: table.table_number, qr_code: table.qr_code }}
                  index={index}
                  qrCodeData={qrCodes[String(table.id)]}
                  deleting={deletingId === table.id}
                  disabled={adding || editing}
                  texts={{
                    tableNumber: L.tableNumber,
                    generatingQR: L.generatingQR,
                    edit: L.edit,
                    viewMenu: L.viewMenu,
                    download: L.download,
                    delete: L.delete,
                    deleteConfirm: L.deleteConfirm,
                    deleteDescription: L.deleteDescription,
                    cancel: L.cancel
                  }}
                  onEdit={(t)=> openEditDialog(t as Table)}
                  onOpenMenu={(url)=> window.open(url, '_blank')}
                  onDownload={(t)=> downloadQRCode(t as Table)}
                  onDelete={(id)=> handleDeleteTable(id)}
                />
              ))}
            </div>
          )}

          <TableDialog
            open={isDialogOpen}
            onOpenChange={(o)=> { if(adding||editing) return; setIsDialogOpen(o); if(!o){ setEditingTable(null); setTableNumberInput('') } }}
            onConfirm={(num, mode)=> { setPendingAction(mode); setTableNumberInput(String(num)); setConfirmSaveOpen(true) }}
            adding={adding}
            editing={editing}
            initialNumber={editingTable?.table_number ?? null}
            texts={{ addTable: L.addTable, editTable: L.editTable, tableNumber: L.tableNumber, tableName: L.tableName, save: L.save, cancel: L.cancel, adding: L.adding || '', updating: L.updating || '' }}
            language={language}
          />
          <SaveConfirmDialog
            open={confirmSaveOpen}
            loading={adding||editing}
            onCancel={()=> { if(adding||editing) return; setConfirmSaveOpen(false); setPendingAction(null) }}
            onConfirm={()=> { if(!pendingAction) return; const num = Number(tableNumberInput); setConfirmSaveOpen(false); if(pendingAction==='add') void performAddTable(num); else void performEditTable(num); setPendingAction(null) }}
            texts={{ confirmSaveTitle: L.confirmSaveTitle, confirmSaveDescription: L.confirmSaveDescription, cancel: L.cancel, confirm: L.confirm }}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
